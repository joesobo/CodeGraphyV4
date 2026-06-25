import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  CODEGRAPHY_MARKDOWN_PLUGIN_ID,
  disableCodeGraphyWorkspacePlugin,
  enableCodeGraphyWorkspacePlugin,
  linkCodeGraphyInstalledPluginPackage,
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
  descriptor?: Record<string, unknown>,
): Promise<void> {
  const packageRoot = path.join(root, ...packageName.split('/'));
  await fs.mkdir(packageRoot, { recursive: true });
  await fs.writeFile(
    path.join(packageRoot, 'package.json'),
    `${JSON.stringify({ name: packageName, ...packageJson }, null, 2)}\n`,
    'utf-8',
  );
  if (descriptor) {
    await fs.writeFile(
      path.join(packageRoot, 'codegraphy.json'),
      `${JSON.stringify(descriptor, null, 2)}\n`,
      'utf-8',
    );
  }
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
    }, {
      id: 'private-plugin',
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
      pluginId: 'private-plugin',
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
    await fs.writeFile(
      path.join(packageRoot, 'codegraphy.json'),
      `${JSON.stringify({
        id: 'acme.private',
        name: 'Acme Private',
        supportedExtensions: ['.acme'],
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
      pluginId: 'acme.private',
      pluginName: 'Acme Private',
      supportedExtensions: ['.acme'],
      disclosures: ['workspaceWrites'],
      packageRoot,
    });
    expect(readCodeGraphyInstalledPluginCache({ homeDir }).plugins).toEqual([record]);
  });

  it('enables a cached plugin for one workspace without installing or importing it', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-workspace-plugin-'));

    enableCodeGraphyWorkspacePlugin(workspaceRoot, {
      package: '@codegraphy-dev/plugin-vue',
      version: '1.2.3',
      apiVersion: '^2.0.0',
      defaultOptions: { includeTests: true },
      disclosures: [],
      packageRoot: '/global/@codegraphy-dev/plugin-vue',
      pluginId: 'codegraphy.vue',
    });

    expect(readCodeGraphyInstalledPluginCache({
      homeDir: path.join(workspaceRoot, 'missing-home'),
    }).plugins).toEqual([]);
    expect(JSON.parse(
      await fs.readFile(path.join(workspaceRoot, '.codegraphy', 'settings.json'), 'utf-8'),
    ).plugins).toEqual([
      { id: CODEGRAPHY_MARKDOWN_PLUGIN_ID, enabled: true },
      {
        id: 'codegraphy.vue',
        enabled: true,
        options: { includeTests: true },
      },
    ]);
  });

  it('merges default options into existing workspace plugin entries and disables by plugin id', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-workspace-plugin-'));
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      plugins: [{
        id: 'codegraphy.vue',
        enabled: true,
        options: { includeTests: false },
      }],
    });

    enableCodeGraphyWorkspacePlugin(workspaceRoot, {
      package: '@codegraphy-dev/plugin-vue',
      version: '1.2.3',
      apiVersion: '^2.0.0',
      defaultOptions: { includeTests: true, pythonVersion: '3.12' },
      disclosures: [],
      packageRoot: '/global/@codegraphy-dev/plugin-vue',
      pluginId: 'codegraphy.vue',
    });

    expect(readCodeGraphyWorkspaceSettings(workspaceRoot).plugins).toEqual([{
      id: 'codegraphy.vue',
      enabled: true,
      options: { includeTests: false, pythonVersion: '3.12' },
    }]);

    disableCodeGraphyWorkspacePlugin(workspaceRoot, 'codegraphy.vue');

    expect(readCodeGraphyWorkspaceSettings(workspaceRoot).plugins).toEqual([{
      id: 'codegraphy.vue',
      enabled: false,
      options: { includeTests: false, pythonVersion: '3.12' },
    }]);
  });

  it('reads optional package manifests and returns null for missing or non-plugin packages', async () => {
    const packageRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-package-reader-'));
    await createPackage(packageRoot, '@codegraphy-dev/plugin-vue', {
      version: '1.2.3',
      codegraphy: {
        type: 'plugin',
        apiVersion: '^2.0.0',
      },
    }, {
      id: 'codegraphy.vue',
      name: 'Vue',
      supportedExtensions: ['.vue'],
      updateImpact: {
        toggle: 'reanalyze-plugin-files',
      },
    });
    await createPackage(packageRoot, '@codegraphy-dev/not-a-plugin', {
      version: '1.0.0',
    });
    const pluginRoot = path.join(packageRoot, '@codegraphy-dev', 'plugin-vue');
    const nonPluginRoot = path.join(packageRoot, '@codegraphy-dev', 'not-a-plugin');

    await expect(readPackageManifest(pluginRoot)).resolves.toEqual({
      package: '@codegraphy-dev/plugin-vue',
      version: '1.2.3',
      apiVersion: '^2.0.0',
      pluginId: 'codegraphy.vue',
      pluginName: 'Vue',
      supportedExtensions: ['.vue'],
      updateImpact: {
        toggle: 'reanalyze-plugin-files',
      },
      disclosures: [],
      packageRoot: pluginRoot,
    });
    await expect(readPackageManifest(nonPluginRoot)).resolves.toBeNull();
    await expect(readPackageManifest(path.join(pluginRoot, 'missing'))).resolves.toBeNull();
  });

  it('requires plugin packages to declare a static plugin id in codegraphy.json', async () => {
    const packageRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-package-reader-'));
    await createPackage(packageRoot, '@codegraphy-dev/plugin-missing-id', {
      version: '1.2.3',
      codegraphy: {
        type: 'plugin',
        apiVersion: '^2.0.0',
      },
    });
    const pluginRoot = path.join(packageRoot, '@codegraphy-dev', 'plugin-missing-id');

    await expect(readPackageManifest(pluginRoot)).resolves.toBeNull();
    await expect(readRequiredPackageManifest('@codegraphy-dev/plugin-missing-id', pluginRoot))
      .rejects.toThrow("Package '@codegraphy-dev/plugin-missing-id' is missing codegraphy.json with a static plugin id.");
  });

  it('requires a matching CodeGraphy plugin package manifest', async () => {
    const packageRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-package-reader-'));
    await createPackage(packageRoot, '@codegraphy-dev/plugin-vue', {
      version: '1.2.3',
      codegraphy: {
        type: 'plugin',
        apiVersion: '^2.0.0',
        disclosures: ['network'],
      },
    }, {
      id: 'codegraphy.vue',
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
    }, {
      id: 'codegraphy.ruby',
    });
    const pluginRoot = path.join(packageRoot, '@codegraphy-dev', 'plugin-vue');
    const nonPluginRoot = path.join(packageRoot, '@codegraphy-dev', 'not-a-plugin');
    const mismatchedRoot = path.join(packageRoot, '@codegraphy-dev', 'plugin-ruby');

    await expect(readRequiredPackageManifest('@codegraphy-dev/plugin-vue', pluginRoot)).resolves.toEqual({
      package: '@codegraphy-dev/plugin-vue',
      version: '1.2.3',
      apiVersion: '^2.0.0',
      pluginId: 'codegraphy.vue',
      disclosures: ['network'],
      packageRoot: pluginRoot,
    });
    await expect(readRequiredPackageManifest('@codegraphy-dev/plugin-vue', path.join(pluginRoot, 'missing')))
      .rejects.toThrow("Run `npm i -g @codegraphy-dev/plugin-vue` first.");
    await expect(readRequiredPackageManifest('@codegraphy-dev/not-a-plugin', nonPluginRoot))
      .rejects.toThrow("Package '@codegraphy-dev/not-a-plugin' is not a CodeGraphy plugin.");
    await expect(readRequiredPackageManifest('@codegraphy-dev/plugin-vue', mismatchedRoot))
      .rejects.toThrow("Package '@codegraphy-dev/plugin-vue' resolved to CodeGraphy plugin '@codegraphy-dev/plugin-ruby'.");
  });

  it('omits empty option objects and persists disabled plugin intent', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-workspace-plugin-'));

    enableCodeGraphyWorkspacePlugin(workspaceRoot, {
      package: '@codegraphy-dev/plugin-ruby',
      version: '1.2.3',
      apiVersion: '^2.0.0',
      disclosures: [],
      packageRoot: '/global/@codegraphy-dev/plugin-ruby',
      pluginId: 'codegraphy.ruby',
    });

    expect(readCodeGraphyWorkspaceSettings(workspaceRoot).plugins).toContainEqual({
      id: 'codegraphy.ruby',
      enabled: true,
    });

    disableCodeGraphyWorkspacePlugin(workspaceRoot, 'codegraphy.ruby');

    expect(readCodeGraphyWorkspaceSettings(workspaceRoot).plugins).toContainEqual({
      id: 'codegraphy.ruby',
      enabled: false,
    });
  });

  it('does not add empty options when re-enabling a plugin without defaults', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-workspace-plugin-'));
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      plugins: [{ id: 'codegraphy.ruby', enabled: false }],
    });

    enableCodeGraphyWorkspacePlugin(workspaceRoot, {
      package: '@codegraphy-dev/plugin-ruby',
      version: '1.2.3',
      apiVersion: '^2.0.0',
      disclosures: [],
      packageRoot: '/global/@codegraphy-dev/plugin-ruby',
      pluginId: 'codegraphy.ruby',
    });

    expect(readCodeGraphyWorkspaceSettings(workspaceRoot).plugins).toEqual([{
      id: 'codegraphy.ruby',
      enabled: true,
    }]);
  });

  it('keeps unrelated workspace plugins when disabling one plugin id', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-workspace-plugin-'));
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      plugins: [
        { id: 'codegraphy.vue', enabled: true },
        { id: 'codegraphy.ruby', enabled: true },
      ],
    });

    disableCodeGraphyWorkspacePlugin(workspaceRoot, 'codegraphy.vue');

    expect(readCodeGraphyWorkspaceSettings(workspaceRoot).plugins).toEqual([
      { id: 'codegraphy.vue', enabled: false },
      { id: 'codegraphy.ruby', enabled: true },
    ]);
  });
});
