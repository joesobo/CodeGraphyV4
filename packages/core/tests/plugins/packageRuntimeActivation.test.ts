import { describe, expect, it, vi } from 'vitest';
import {
  resolveCodeGraphyWorkspacePluginRecords,
  loadCodeGraphyWorkspacePluginPackages,
  readCodeGraphyWorkspaceSettings,
  writeCodeGraphyInstalledPluginCache,
  writeCodeGraphyWorkspaceSettings,
} from '../../src';
import {
  createPackageFixtureRoot,
  createPluginPackage,
  createPluginPackageWithRuntimeMarkers,
  createWorkspace,
  fs,
  os,
  path,
} from './packageRuntimeFixture';

describe('CodeGraphy package runtime', () => {
  it('leaves an enabled non-Core plugin dormant', async () => {
    const workspaceRoot = await createWorkspace();
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-package-runtime-home-'));
    const packageRoot = path.join(
      await createPackageFixtureRoot('codegraphy-package-runtime-package-'),
      'node_modules',
      '@acme',
      'codegraphy-plugin-extension-only',
    );
    const markers = await createPluginPackageWithRuntimeMarkers(
      packageRoot,
      '@acme/codegraphy-plugin-extension-only',
      'acme.extension-only',
    );
    writeCodeGraphyInstalledPluginCache({
      version: 3,
      plugins: [{
        package: '@acme/codegraphy-plugin-extension-only',
        version: '1.0.0',
        id: 'acme.extension-only',
        host: 'codegraphy.extension',
        entry: './plugin.js',
        apiVersion: '^1.0.0',
        packageRoot,
        globallyEnabled: true,
      }],
    }, { homeDir });

    const options = {
      settings: readCodeGraphyWorkspaceSettings(workspaceRoot),
      homeDir,
      workspaceRoot,
    };

    await expect(resolveCodeGraphyWorkspacePluginRecords(options)).resolves.toEqual({
      bundledPackageRoots: new Set(),
      records: [expect.objectContaining({
        id: 'acme.extension-only',
        host: 'codegraphy.extension',
      })],
    });
    await expect(loadCodeGraphyWorkspacePluginPackages(options)).resolves.toEqual([]);
    await expect(fs.access(markers.importMarkerPath)).rejects.toThrow();
    await expect(fs.access(markers.factoryMarkerPath)).rejects.toThrow();
  });

  it('loads a globally enabled plugin when the workspace inherits its activation', async () => {
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
      version: 3,
      plugins: [{
        package: '@acme/codegraphy-plugin-data-host',
        version: '1.0.0',
        host: 'core',
        entry: './plugin.js',
        apiVersion: '^4.0.0',
        globallyEnabled: true,
        packageRoot,
        id: 'acme.data-host',
      }],
    }, { homeDir });

    const loadedPlugins = await loadCodeGraphyWorkspacePluginPackages({
      settings: readCodeGraphyWorkspaceSettings(workspaceRoot),
      homeDir,
      workspaceRoot,
    });

    expect(loadedPlugins.map(plugin => plugin.plugin.id)).toEqual(['acme.data-host']);
  });

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
      version: 3,
      plugins: [{
        package: '@acme/codegraphy-plugin-data-host',
        version: '1.0.0',
        host: 'core',
        entry: './plugin.js',
        apiVersion: '^4.0.0',
        packageRoot,
        id: 'acme.data-host',
        globallyEnabled: false,
      }],
    }, { homeDir });
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      plugins: [{
        id: 'acme.data-host',
        activation: 'enabled',
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
      version: 3,
      plugins: [{
        package: '@acme/codegraphy-plugin-disabled-runtime',
        version: '1.0.0',
        host: 'core',
        entry: './plugin.js',
        apiVersion: '^4.0.0',
        packageRoot,
        id: 'acme.disabled-runtime',
        name: 'Disabled Runtime Plugin',
        globallyEnabled: false,
      }],
    }, { homeDir });
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      plugins: [{
        id: 'acme.disabled-runtime',
        activation: 'enabled',
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
      version: 3,
      plugins: [
        {
          package: '@acme/codegraphy-plugin-vue-one',
          version: '1.0.0',
          host: 'core',
          entry: './plugin.js',
          apiVersion: '^4.0.0',
          packageRoot: packageRootOne,
          id: 'codegraphy.vue',
          globallyEnabled: false,
        },
        {
          package: '@acme/codegraphy-plugin-vue-two',
          version: '1.0.0',
          host: 'core',
          entry: './plugin.js',
          apiVersion: '^4.0.0',
          packageRoot: packageRootTwo,
          id: 'codegraphy.vue',
          globallyEnabled: false,
        },
      ],
    }, { homeDir });
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      plugins: [{
        id: 'codegraphy.vue',
        activation: 'enabled',
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
});
