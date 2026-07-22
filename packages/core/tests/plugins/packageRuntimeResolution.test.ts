import { describe, expect, it, vi } from 'vitest';
import {
  loadCodeGraphyWorkspacePluginPackages,
  resolveCodeGraphyWorkspacePluginRecordsForHost,
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
  it('preserves global activation when a bundled descriptor replaces its installed record', async () => {
    const workspaceRoot = await createWorkspace();
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-package-runtime-home-'));
    const packageName = '@acme/codegraphy-plugin-bundled-extension';
    const pluginId = 'acme.bundled-extension';
    const bundledPackageRoot = path.join(
      await createPackageFixtureRoot('codegraphy-package-runtime-bundled-'),
      'codegraphy-plugin-bundled-extension',
    );

    await fs.mkdir(bundledPackageRoot, { recursive: true });
    await fs.writeFile(path.join(bundledPackageRoot, 'package.json'), `${JSON.stringify({
      name: packageName,
      version: '1.0.1',
      codegraphy: {
        plugins: [{
          id: pluginId,
          host: 'codegraphy.extension',
          entry: './extension.js',
          apiVersion: '^1.0.0',
        }],
      },
    }, null, 2)}\n`, 'utf-8');
    writeCodeGraphyInstalledPluginCache({
      version: 3,
      plugins: [{
        package: packageName,
        version: '1.0.0',
        host: 'codegraphy.extension',
        entry: './extension.js',
        apiVersion: '^1.0.0',
        packageRoot: '/stale/global/package',
        id: pluginId,
        globallyEnabled: true,
      }],
    }, { homeDir });

    const resolved = await resolveCodeGraphyWorkspacePluginRecordsForHost({
      bundledPackageRoots: [bundledPackageRoot],
      settings: readCodeGraphyWorkspaceSettings(workspaceRoot),
      homeDir,
      workspaceRoot,
    }, 'codegraphy.extension');

    expect(resolved.records).toEqual([expect.objectContaining({
      id: pluginId,
      packageRoot: bundledPackageRoot,
      globallyEnabled: true,
    })]);
  });

  it('returns active descriptors only for the requested open host', async () => {
    const workspaceRoot = await createWorkspace();
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-package-runtime-home-'));
    writeCodeGraphyInstalledPluginCache({
      version: 3,
      plugins: [
        {
          package: '@acme/codegraphy-plugin-multi-host',
          version: '1.0.0',
          host: 'core',
          entry: './core.js',
          apiVersion: '^4.0.0',
          packageRoot: '/global/multi-host',
          id: 'acme.core',
          globallyEnabled: true,
        },
        {
          package: '@acme/codegraphy-plugin-multi-host',
          version: '1.0.0',
          host: 'codegraphy.extension',
          entry: './extension.js',
          apiVersion: '^1.0.0',
          packageRoot: '/global/multi-host',
          id: 'acme.extension',
          globallyEnabled: true,
        },
      ],
    }, { homeDir });

    const resolved = await resolveCodeGraphyWorkspacePluginRecordsForHost({
      settings: readCodeGraphyWorkspaceSettings(workspaceRoot),
      homeDir,
      workspaceRoot,
    }, 'codegraphy.extension');

    expect(resolved.records.map(record => record.id)).toEqual(['acme.extension']);
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
      version: 3,
      plugins: [{
        package: packageName,
        version: '1.0.0',
        host: 'core',
        entry: './plugin.js',
        apiVersion: '^4.0.0',
        packageRoot: stalePackageRoot,
        id: pluginId,
        name: 'Stale Runtime Plugin',
        globallyEnabled: false,
      }],
    }, { homeDir });
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      plugins: [{
        id: pluginId,
        activation: 'enabled',
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
      version: 3,
      plugins: [{
        package: '@acme/codegraphy-plugin-id-mismatch',
        version: '1.0.0',
        host: 'core',
        entry: './plugin.js',
        apiVersion: '^4.0.0',
        packageRoot,
        id: 'acme.static-id',
        globallyEnabled: false,
      }],
    }, { homeDir });
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      plugins: [{
        id: 'acme.static-id',
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
      "CodeGraphy plugin 'acme.static-id' could not be loaded: Package '@acme/codegraphy-plugin-id-mismatch' exported plugin id 'acme.runtime-id', but its package manifest declares 'acme.static-id'.",
    );
  });
});
