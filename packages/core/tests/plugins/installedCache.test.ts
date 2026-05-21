import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
  addCodeGraphyInstalledPlugin,
  enableCodeGraphyWorkspacePlugin,
  getInstalledPluginsCachePath,
  linkCodeGraphyInstalledPluginPackage,
  readCodeGraphyInstalledPluginCache,
  refreshCodeGraphyInstalledPlugins,
} from '../../src';

async function createPackage(
  root: string,
  packageName: string,
  packageJson: Record<string, unknown>,
): Promise<void> {
  const packageRoot = path.join(root, ...packageName.split('/'));
  await fs.mkdir(packageRoot, { recursive: true });
  await fs.writeFile(
    path.join(packageRoot, 'package.json'),
    `${JSON.stringify({ name: packageName, ...packageJson }, null, 2)}\n`,
    'utf-8',
  );
}

describe('CodeGraphy installed plugin cache', () => {
  it('refreshes only @codegraphy-dev packages with plugin metadata into user-level cache', async () => {
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-user-home-'));
    const globalRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-global-root-'));
    await createPackage(globalRoot, '@codegraphy-dev/plugin-python', {
      version: '1.2.3',
      codegraphy: {
        type: 'plugin',
        apiVersion: '^2.0.0',
        defaultOptions: { includeTests: true },
      },
    });
    await createPackage(globalRoot, '@codegraphy-dev/not-a-plugin', {
      version: '1.0.0',
    });
    await createPackage(globalRoot, 'private-plugin', {
      version: '1.0.0',
      codegraphy: {
        type: 'plugin',
        apiVersion: '^2.0.0',
      },
    });

    const cache = await refreshCodeGraphyInstalledPlugins({
      homeDir,
      globalPackageRoots: [globalRoot],
    });

    expect(cache.plugins).toEqual([{
      package: '@codegraphy-dev/plugin-python',
      version: '1.2.3',
      apiVersion: '^2.0.0',
      defaultOptions: { includeTests: true },
      disclosures: [],
      packageRoot: path.join(globalRoot, '@codegraphy-dev', 'plugin-python'),
    }]);
    expect(await fs.readFile(getInstalledPluginsCachePath(homeDir), 'utf-8')).toContain('@codegraphy-dev/plugin-python');
    expect(readCodeGraphyInstalledPluginCache({ homeDir })).toEqual(cache);
  });

  it('preserves explicitly added non-CodeGraphy scoped plugins during refresh', async () => {
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-user-home-'));
    const globalRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-global-root-'));
    const manualRecord = {
      package: 'private-plugin',
      version: '4.5.6',
      apiVersion: '^2.0.0',
      disclosures: [],
      packageRoot: path.join(globalRoot, 'private-plugin'),
    };
    await createPackage(globalRoot, '@codegraphy-dev/plugin-python', {
      version: '1.2.3',
      codegraphy: {
        type: 'plugin',
        apiVersion: '^2.0.0',
      },
    });

    await fs.mkdir(path.dirname(getInstalledPluginsCachePath(homeDir)), { recursive: true });
    await fs.writeFile(
      getInstalledPluginsCachePath(homeDir),
      `${JSON.stringify({ version: 1, plugins: [manualRecord] }, null, 2)}\n`,
      'utf-8',
    );

    const cache = await refreshCodeGraphyInstalledPlugins({
      homeDir,
      globalPackageRoots: [globalRoot],
    });

    expect(cache.plugins.map(plugin => plugin.package)).toEqual([
      '@codegraphy-dev/plugin-python',
      'private-plugin',
    ]);
  });

  it('adds an explicitly named globally installed plugin package to the user-level cache', async () => {
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-user-home-'));
    const globalRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-global-root-'));
    await createPackage(globalRoot, 'private-plugin', {
      version: '4.5.6',
      codegraphy: {
        type: 'plugin',
        apiVersion: '^2.0.0',
        disclosures: ['externalProcesses'],
      },
    });

    const record = await addCodeGraphyInstalledPlugin({
      homeDir,
      packageName: 'private-plugin',
      globalPackageRoots: [globalRoot],
    });

    expect(record).toEqual({
      package: 'private-plugin',
      version: '4.5.6',
      apiVersion: '^2.0.0',
      disclosures: ['externalProcesses'],
      packageRoot: path.join(globalRoot, 'private-plugin'),
    });
    expect(readCodeGraphyInstalledPluginCache({ homeDir }).plugins).toEqual([record]);
  });

  it('links a private local plugin package root into the user-level cache', async () => {
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-user-home-'));
    const packageRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-private-package-'));
    await fs.writeFile(
      path.join(packageRoot, 'package.json'),
      `${JSON.stringify({
        name: '@acme/codegraphy-private-plugin',
        version: '0.1.0',
        codegraphy: {
          type: 'plugin',
          apiVersion: '^2.0.0',
          disclosures: ['workspaceWrites'],
        },
      }, null, 2)}\n`,
      'utf-8',
    );

    const record = await linkCodeGraphyInstalledPluginPackage({
      homeDir,
      packageRoot,
    });

    expect(record).toEqual({
      package: '@acme/codegraphy-private-plugin',
      version: '0.1.0',
      apiVersion: '^2.0.0',
      disclosures: ['workspaceWrites'],
      packageRoot,
    });
    expect(readCodeGraphyInstalledPluginCache({ homeDir }).plugins).toEqual([record]);
  });

  it('enables a cached plugin for one workspace without installing or importing it', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-workspace-plugin-'));

    enableCodeGraphyWorkspacePlugin(workspaceRoot, {
      package: '@codegraphy-dev/plugin-python',
      version: '1.2.3',
      apiVersion: '^2.0.0',
      defaultOptions: { includeTests: true },
      disclosures: [],
      packageRoot: '/global/@codegraphy-dev/plugin-python',
    });

    expect(readCodeGraphyInstalledPluginCache({
      homeDir: path.join(workspaceRoot, 'missing-home'),
    }).plugins).toEqual([]);
    expect(JSON.parse(
      await fs.readFile(path.join(workspaceRoot, '.codegraphy', 'settings.json'), 'utf-8'),
    ).plugins).toEqual([
      { package: CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME },
      {
        package: '@codegraphy-dev/plugin-python',
        options: { includeTests: true },
      },
    ]);
  });
});
