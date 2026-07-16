import { describe, expect, it, vi } from 'vitest';
import {
  loadCodeGraphyWorkspacePluginPackages,
  readCodeGraphyWorkspaceSettings,
  writeCodeGraphyInstalledPluginCache,
  writeCodeGraphyWorkspaceSettings,
} from '../../src';
import {
  createPackageFixtureRoot,
  createPluginPackageWithRuntimeMarkers,
  createWorkspace,
  fs,
  os,
  path,
} from './packageRuntimeFixture';

describe('CodeGraphy package runtime', () => {
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
        apiVersion: '^3.0.0',
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
        apiVersion: '^3.0.0',
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
