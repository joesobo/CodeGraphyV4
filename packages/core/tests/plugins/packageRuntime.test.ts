import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import {
  loadCodeGraphyWorkspacePluginPackages,
  readCodeGraphyWorkspaceSettings,
  writeCodeGraphyInstalledPluginCache,
  writeCodeGraphyWorkspaceSettings,
} from '../../src';

async function createWorkspace(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-package-runtime-workspace-'));
}

async function createPackageFixtureRoot(prefix: string): Promise<string> {
  const root = path.join(process.cwd(), 'node_modules', '.cache', 'codegraphy-test-packages');
  await fs.mkdir(root, { recursive: true });
  return fs.mkdtemp(path.join(root, prefix));
}

async function createPluginPackage(packageRoot: string): Promise<void> {
  await fs.mkdir(packageRoot, { recursive: true });
  await fs.writeFile(
    path.join(packageRoot, 'package.json'),
    `${JSON.stringify({
      name: '@acme/codegraphy-plugin-data-host',
      version: '1.0.0',
      type: 'module',
      exports: './plugin.js',
      codegraphy: {
        type: 'plugin',
        apiVersion: '^2.0.0',
        defaultOptions: {
          marker: 'from-default-options',
        },
      },
    }, null, 2)}\n`,
    'utf-8',
  );
  await fs.writeFile(
    path.join(packageRoot, 'plugin.js'),
    `
export default function createPlugin(factoryOptions = {}) {
  const dataHost = factoryOptions.dataHost;
  const marker = factoryOptions.options?.marker ?? 'missing-options';

  return {
    id: 'acme.data-host',
    name: 'Data Host Plugin',
    version: '1.0.0',
    apiVersion: '^2.0.0',
    supportedExtensions: [],
    async initialize() {
      if (!dataHost) {
        throw new Error('Expected factory dataHost.');
      }
      await dataHost.saveData({ marker });
    }
  };
}
`,
    'utf-8',
  );
}

async function createPluginPackageWithRuntimeMarkers(
  packageRoot: string,
  packageName = '@acme/codegraphy-plugin-disabled-runtime',
  pluginId = 'acme.disabled-runtime',
  pluginName = 'Disabled Runtime Plugin',
  version = '1.0.0',
): Promise<{
  factoryMarkerPath: string;
  importMarkerPath: string;
}> {
  const importMarkerPath = path.join(packageRoot, 'runtime-imported.txt');
  const factoryMarkerPath = path.join(packageRoot, 'factory-called.txt');

  await fs.mkdir(packageRoot, { recursive: true });
  await fs.writeFile(
    path.join(packageRoot, 'package.json'),
    `${JSON.stringify({
      name: packageName,
      version,
      type: 'module',
      exports: './plugin.js',
      codegraphy: {
        type: 'plugin',
        apiVersion: '^2.0.0',
      },
    }, null, 2)}\n`,
    'utf-8',
  );
  await fs.writeFile(
    path.join(packageRoot, 'codegraphy.json'),
    `${JSON.stringify({
      id: pluginId,
      name: pluginName,
      version,
      apiVersion: '^2.0.0',
      supportedExtensions: ['.disabled'],
    }, null, 2)}\n`,
    'utf-8',
  );
  await fs.writeFile(
    path.join(packageRoot, 'plugin.js'),
    `
import { writeFileSync } from 'node:fs';

writeFileSync(${JSON.stringify(importMarkerPath)}, 'imported');

export default function createPlugin() {
  writeFileSync(${JSON.stringify(factoryMarkerPath)}, 'factory called');
  return {
    id: ${JSON.stringify(pluginId)},
    name: ${JSON.stringify(pluginName)},
    version: ${JSON.stringify(version)},
    apiVersion: '^2.0.0',
    supportedExtensions: ['.disabled']
  };
}
`,
    'utf-8',
  );

  return { factoryMarkerPath, importMarkerPath };
}

describe('CodeGraphy package runtime', () => {
  it('passes workspace plugin data host and options to package plugin factories', async () => {
    const workspaceRoot = await createWorkspace();
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-package-runtime-home-'));
    const packageRoot = path.join(
      await createPackageFixtureRoot('codegraphy-package-runtime-package-'),
      'node_modules',
      '@acme',
      'codegraphy-plugin-data-host',
    );

    await createPluginPackage(packageRoot);
    writeCodeGraphyInstalledPluginCache({
      version: 1,
      plugins: [{
        package: '@acme/codegraphy-plugin-data-host',
        version: '1.0.0',
        apiVersion: '^2.0.0',
        disclosures: ['workspaceWrites'],
        packageRoot,
        pluginId: 'acme.data-host',
        defaultOptions: {
          marker: 'from-default-options',
        },
      }],
    }, { homeDir });
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      plugins: [{
        id: 'acme.data-host',
        enabled: true,
        options: {
          marker: 'from-workspace-options',
        },
      }],
    });

    const [loadedPlugin] = await loadCodeGraphyWorkspacePluginPackages({
      settings: readCodeGraphyWorkspaceSettings(workspaceRoot),
      homeDir,
      workspaceRoot,
    });

    await loadedPlugin?.plugin.initialize?.(workspaceRoot);

    expect(readCodeGraphyWorkspaceSettings(workspaceRoot).pluginData).toEqual({
      'acme.data-host': {
        marker: 'from-workspace-options',
      },
    });
  });

  it('leaves disabled installed package runtimes unloaded while retaining static metadata', async () => {
    const workspaceRoot = await createWorkspace();
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-package-runtime-home-'));
    const packageRoot = path.join(
      await createPackageFixtureRoot('codegraphy-package-runtime-package-'),
      'node_modules',
      '@acme',
      'codegraphy-plugin-disabled-runtime',
    );
    const { factoryMarkerPath, importMarkerPath } = await createPluginPackageWithRuntimeMarkers(packageRoot);

    writeCodeGraphyInstalledPluginCache({
      version: 1,
      plugins: [{
        package: '@acme/codegraphy-plugin-disabled-runtime',
        version: '1.0.0',
        apiVersion: '^2.0.0',
        disclosures: [],
        packageRoot,
        pluginId: 'acme.disabled-runtime',
        pluginName: 'Disabled Runtime Plugin',
        supportedExtensions: ['.disabled'],
      }],
    }, { homeDir });
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      plugins: [{
        id: 'acme.disabled-runtime',
        enabled: true,
      }],
    });

    const loadedPlugins = await loadCodeGraphyWorkspacePluginPackages({
      settings: readCodeGraphyWorkspaceSettings(workspaceRoot),
      homeDir,
      workspaceRoot,
      disabledPlugins: new Set(['acme.disabled-runtime']),
    });

    expect(loadedPlugins).toEqual([]);
    await expect(fs.access(importMarkerPath)).rejects.toThrow();
    await expect(fs.access(factoryMarkerPath)).rejects.toThrow();
  });

  it('leaves conflicting enabled package runtimes unloaded and warns from static metadata', async () => {
    const workspaceRoot = await createWorkspace();
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-package-runtime-home-'));
    const packageRootOne = path.join(
      await createPackageFixtureRoot('codegraphy-package-runtime-package-'),
      'node_modules',
      '@acme',
      'codegraphy-plugin-vue-one',
    );
    const packageRootTwo = path.join(
      await createPackageFixtureRoot('codegraphy-package-runtime-package-'),
      'node_modules',
      '@acme',
      'codegraphy-plugin-vue-two',
    );
    const firstMarkers = await createPluginPackageWithRuntimeMarkers(
      packageRootOne,
      '@acme/codegraphy-plugin-vue-one',
      'codegraphy.vue',
    );
    const secondMarkers = await createPluginPackageWithRuntimeMarkers(
      packageRootTwo,
      '@acme/codegraphy-plugin-vue-two',
      'codegraphy.vue',
    );
    const warn = vi.fn();

    writeCodeGraphyInstalledPluginCache({
      version: 1,
      plugins: [
        {
          package: '@acme/codegraphy-plugin-vue-one',
          version: '1.0.0',
          apiVersion: '^2.0.0',
          disclosures: [],
          packageRoot: packageRootOne,
          pluginId: 'codegraphy.vue',
        },
        {
          package: '@acme/codegraphy-plugin-vue-two',
          version: '1.0.0',
          apiVersion: '^2.0.0',
          disclosures: [],
          packageRoot: packageRootTwo,
          pluginId: 'codegraphy.vue',
        },
      ],
    }, { homeDir });
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      plugins: [{
        id: 'codegraphy.vue',
        enabled: true,
      }],
    });

    const loadedPlugins = await loadCodeGraphyWorkspacePluginPackages({
      settings: readCodeGraphyWorkspaceSettings(workspaceRoot),
      homeDir,
      workspaceRoot,
      warn,
    });

    expect(loadedPlugins).toEqual([]);
    expect(warn).toHaveBeenCalledWith(
      "CodeGraphy plugin 'codegraphy.vue' is enabled but multiple installed packages claim it: @acme/codegraphy-plugin-vue-one, @acme/codegraphy-plugin-vue-two. No runtime was loaded.",
    );
    await expect(fs.access(firstMarkers.importMarkerPath)).rejects.toThrow();
    await expect(fs.access(firstMarkers.factoryMarkerPath)).rejects.toThrow();
    await expect(fs.access(secondMarkers.importMarkerPath)).rejects.toThrow();
    await expect(fs.access(secondMarkers.factoryMarkerPath)).rejects.toThrow();
  });

  it('prefers bundled package roots over stale installed package records', async () => {
    const workspaceRoot = await createWorkspace();
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-package-runtime-home-'));
    const packageName = '@acme/codegraphy-plugin-bundled-runtime';
    const pluginId = 'acme.bundled-runtime';
    const stalePackageRoot = path.join(
      await createPackageFixtureRoot('codegraphy-package-runtime-package-'),
      'node_modules',
      '@acme',
      'codegraphy-plugin-bundled-runtime',
    );
    const bundledPackageRoot = path.join(
      await createPackageFixtureRoot('codegraphy-package-runtime-bundled-'),
      'codegraphy-plugin-bundled-runtime',
    );

    await createPluginPackageWithRuntimeMarkers(
      stalePackageRoot,
      packageName,
      pluginId,
      'Stale Runtime Plugin',
      '1.0.0',
    );
    await createPluginPackageWithRuntimeMarkers(
      bundledPackageRoot,
      packageName,
      pluginId,
      'Bundled Runtime Plugin',
      '1.0.1',
    );
    writeCodeGraphyInstalledPluginCache({
      version: 1,
      plugins: [{
        package: packageName,
        version: '1.0.0',
        apiVersion: '^2.0.0',
        disclosures: [],
        packageRoot: stalePackageRoot,
        pluginId,
        pluginName: 'Stale Runtime Plugin',
      }],
    }, { homeDir });
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      plugins: [{
        id: pluginId,
        enabled: true,
      }],
    });

    const [loadedPlugin] = await loadCodeGraphyWorkspacePluginPackages({
      bundledPackageRoots: [bundledPackageRoot],
      settings: readCodeGraphyWorkspaceSettings(workspaceRoot),
      homeDir,
      workspaceRoot,
      warn: message => {
        throw new Error(message);
      },
    });

    expect(loadedPlugin?.bundled).toBe(true);
    expect(loadedPlugin?.record.packageRoot).toBe(bundledPackageRoot);
    expect(loadedPlugin?.plugin.name).toBe('Bundled Runtime Plugin');
  });

  it('refuses package runtimes whose plugin id does not match static metadata', async () => {
    const workspaceRoot = await createWorkspace();
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-package-runtime-home-'));
    const packageRoot = path.join(
      await createPackageFixtureRoot('codegraphy-package-runtime-package-'),
      'node_modules',
      '@acme',
      'codegraphy-plugin-id-mismatch',
    );
    await createPluginPackageWithRuntimeMarkers(
      packageRoot,
      '@acme/codegraphy-plugin-id-mismatch',
      'acme.runtime-id',
    );
    const warn = vi.fn();

    writeCodeGraphyInstalledPluginCache({
      version: 1,
      plugins: [{
        package: '@acme/codegraphy-plugin-id-mismatch',
        version: '1.0.0',
        apiVersion: '^2.0.0',
        disclosures: [],
        packageRoot,
        pluginId: 'acme.static-id',
      }],
    }, { homeDir });
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      plugins: [{
        id: 'acme.static-id',
        enabled: true,
      }],
    });

    const loadedPlugins = await loadCodeGraphyWorkspacePluginPackages({
      settings: readCodeGraphyWorkspaceSettings(workspaceRoot),
      homeDir,
      workspaceRoot,
      warn,
    });

    expect(loadedPlugins).toEqual([]);
    expect(warn).toHaveBeenCalledWith(
      "CodeGraphy plugin 'acme.static-id' could not be loaded: Package '@acme/codegraphy-plugin-id-mismatch' exported plugin id 'acme.runtime-id', but codegraphy.json declares 'acme.static-id'.",
    );
  });
});
