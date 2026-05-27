import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
  disableCodeGraphyWorkspacePlugin,
  enableCodeGraphyWorkspacePlugin,
  readCodeGraphyInstalledPluginCache,
  readCodeGraphyWorkspaceSettings,
  registerCodeGraphyInstalledPlugin,
  writeCodeGraphyWorkspaceSettings,
} from '../../src';
import {
  readPackageManifest,
  readRequiredPackageManifest,
} from '../../src/plugins/installedPluginCache/packageReader';

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

describe('CodeGraphy Plugin Registry', () => {
  it('registers an explicitly named globally installed plugin package to the user-level registry', async () => {
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

    const record = await registerCodeGraphyInstalledPlugin({
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

  it('enables a registered plugin for one workspace without installing or importing it', async () => {
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

  it('merges default options into existing workspace plugin entries and disables by package', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-workspace-plugin-'));
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      plugins: [{
        package: '@codegraphy-dev/plugin-python',
        options: { includeTests: false },
      }],
    });

    enableCodeGraphyWorkspacePlugin(workspaceRoot, {
      package: '@codegraphy-dev/plugin-python',
      version: '1.2.3',
      apiVersion: '^2.0.0',
      defaultOptions: { includeTests: true, pythonVersion: '3.12' },
      disclosures: [],
      packageRoot: '/global/@codegraphy-dev/plugin-python',
    });

    expect(readCodeGraphyWorkspaceSettings(workspaceRoot).plugins).toEqual([{
      package: '@codegraphy-dev/plugin-python',
      options: { includeTests: false, pythonVersion: '3.12' },
    }]);

    disableCodeGraphyWorkspacePlugin(workspaceRoot, '@codegraphy-dev/plugin-python');

    expect(readCodeGraphyWorkspaceSettings(workspaceRoot).plugins).toEqual([]);
  });

  it('reads optional package manifests and returns null for missing or non-plugin packages', async () => {
    const packageRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-package-reader-'));
    await createPackage(packageRoot, '@codegraphy-dev/plugin-python', {
      version: '1.2.3',
      codegraphy: {
        type: 'plugin',
        apiVersion: '^2.0.0',
      },
    });
    await createPackage(packageRoot, '@codegraphy-dev/not-a-plugin', {
      version: '1.0.0',
    });
    const pluginRoot = path.join(packageRoot, '@codegraphy-dev', 'plugin-python');
    const nonPluginRoot = path.join(packageRoot, '@codegraphy-dev', 'not-a-plugin');

    await expect(readPackageManifest(pluginRoot)).resolves.toEqual({
      package: '@codegraphy-dev/plugin-python',
      version: '1.2.3',
      apiVersion: '^2.0.0',
      disclosures: [],
      packageRoot: pluginRoot,
    });
    await expect(readPackageManifest(nonPluginRoot)).resolves.toBeNull();
    await expect(readPackageManifest(path.join(pluginRoot, 'missing'))).resolves.toBeNull();
  });

  it('requires a matching CodeGraphy plugin package manifest', async () => {
    const packageRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-package-reader-'));
    await createPackage(packageRoot, '@codegraphy-dev/plugin-python', {
      version: '1.2.3',
      codegraphy: {
        type: 'plugin',
        apiVersion: '^2.0.0',
        disclosures: ['network'],
      },
    });
    await createPackage(packageRoot, '@codegraphy-dev/not-a-plugin', {
      version: '1.0.0',
    });
    await createPackage(packageRoot, '@codegraphy-dev/plugin-ruby', {
      version: '1.2.3',
      codegraphy: {
        type: 'plugin',
        apiVersion: '^2.0.0',
      },
    });
    const pluginRoot = path.join(packageRoot, '@codegraphy-dev', 'plugin-python');
    const nonPluginRoot = path.join(packageRoot, '@codegraphy-dev', 'not-a-plugin');
    const mismatchedRoot = path.join(packageRoot, '@codegraphy-dev', 'plugin-ruby');

    await expect(readRequiredPackageManifest('@codegraphy-dev/plugin-python', pluginRoot)).resolves.toEqual({
      package: '@codegraphy-dev/plugin-python',
      version: '1.2.3',
      apiVersion: '^2.0.0',
      disclosures: ['network'],
      packageRoot: pluginRoot,
    });
    await expect(readRequiredPackageManifest('@codegraphy-dev/plugin-python', path.join(pluginRoot, 'missing')))
      .rejects.toThrow("Run `npm i -g @codegraphy-dev/plugin-python` first.");
    await expect(readRequiredPackageManifest('@codegraphy-dev/not-a-plugin', nonPluginRoot))
      .rejects.toThrow("Package '@codegraphy-dev/not-a-plugin' is not a CodeGraphy plugin.");
    await expect(readRequiredPackageManifest('@codegraphy-dev/plugin-python', mismatchedRoot))
      .rejects.toThrow("Package '@codegraphy-dev/plugin-python' resolved to CodeGraphy plugin '@codegraphy-dev/plugin-ruby'.");
  });

  it('omits empty option objects and removes disabled packages', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-workspace-plugin-'));

    enableCodeGraphyWorkspacePlugin(workspaceRoot, {
      package: '@codegraphy-dev/plugin-ruby',
      version: '1.2.3',
      apiVersion: '^2.0.0',
      disclosures: [],
      packageRoot: '/global/@codegraphy-dev/plugin-ruby',
    });

    expect(readCodeGraphyWorkspaceSettings(workspaceRoot).plugins).toContainEqual({
      package: '@codegraphy-dev/plugin-ruby',
    });

    disableCodeGraphyWorkspacePlugin(workspaceRoot, '@codegraphy-dev/plugin-ruby');

    expect(readCodeGraphyWorkspaceSettings(workspaceRoot).plugins).not.toContainEqual({
      package: '@codegraphy-dev/plugin-ruby',
    });
  });

  it('does not add empty options when re-enabling a plugin without defaults', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-workspace-plugin-'));
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      plugins: [{ package: '@codegraphy-dev/plugin-ruby' }],
    });

    enableCodeGraphyWorkspacePlugin(workspaceRoot, {
      package: '@codegraphy-dev/plugin-ruby',
      version: '1.2.3',
      apiVersion: '^2.0.0',
      disclosures: [],
      packageRoot: '/global/@codegraphy-dev/plugin-ruby',
    });

    expect(readCodeGraphyWorkspaceSettings(workspaceRoot).plugins).toEqual([{
      package: '@codegraphy-dev/plugin-ruby',
    }]);
  });

  it('keeps unrelated workspace plugins when disabling one package', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-workspace-plugin-'));
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      plugins: [
        { package: '@codegraphy-dev/plugin-python' },
        { package: '@codegraphy-dev/plugin-ruby' },
      ],
    });

    disableCodeGraphyWorkspacePlugin(workspaceRoot, '@codegraphy-dev/plugin-python');

    expect(readCodeGraphyWorkspaceSettings(workspaceRoot).plugins).toEqual([
      { package: '@codegraphy-dev/plugin-ruby' },
    ]);
  });
});
