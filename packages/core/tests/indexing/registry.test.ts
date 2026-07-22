import { describe, expect, it, vi } from 'vitest';
import {
  readCodeGraphyWorkspaceSettings,
  writeCodeGraphyInstalledPluginCache,
} from '../../src';
import { createWorkspaceIndexRegistry } from '../../src/indexing/registry';
import { createTextPlugin, createWorkspace } from './workspaceFixture';
import {
  createPackageFixtureRoot,
  createPluginPackageWithRuntimeMarkers,
  fs,
  os,
  path,
} from '../plugins/packageRuntimeFixture';

describe('createWorkspaceIndexRegistry', () => {
  it('disposes a rejected package runtime and continues with later packages', async () => {
    const workspaceRoot = await createWorkspace();
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-index-registry-home-'));
    const brokenRoot = await createPackageFixtureRoot('codegraphy-index-registry-broken-');
    const healthyRoot = await createPackageFixtureRoot('codegraphy-index-registry-healthy-');
    const brokenUnloadMarker = path.join(brokenRoot, 'unloaded.txt');
    await createPluginPackageWithRuntimeMarkers(
      brokenRoot,
      '@acme/codegraphy-plugin-broken',
      'acme.broken',
      'Broken Plugin',
      '1.0.0',
      '^4.0.0',
      '^99.0.0',
      brokenUnloadMarker,
    );
    await createPluginPackageWithRuntimeMarkers(
      healthyRoot,
      '@acme/codegraphy-plugin-healthy',
      'acme.healthy',
      'Healthy Plugin',
    );
    writeCodeGraphyInstalledPluginCache({
      version: 3,
      plugins: [
        {
          package: '@acme/codegraphy-plugin-broken', version: '1.0.0',
          id: 'acme.broken', host: 'core', entry: './plugin.js', apiVersion: '^4.0.0',
          packageRoot: brokenRoot, globallyEnabled: true,
        },
        {
          package: '@acme/codegraphy-plugin-healthy', version: '1.0.0',
          id: 'acme.healthy', host: 'core', entry: './plugin.js', apiVersion: '^4.0.0',
          packageRoot: healthyRoot, globallyEnabled: true,
        },
      ],
    }, { homeDir });
    const warn = vi.fn();

    const result = await createWorkspaceIndexRegistry(
      { workspaceRoot, userHomeDir: homeDir, includeCorePlugins: false, warn },
      readCodeGraphyWorkspaceSettings(workspaceRoot),
      workspaceRoot,
    );

    expect(result.registry.list().map(({ plugin }) => plugin.id)).toEqual(['acme.healthy']);
    expect(result.loadedPackagePlugins.map(({ plugin }) => plugin.id)).toEqual(['acme.healthy']);
    expect(await fs.readFile(brokenUnloadMarker, 'utf8')).toBe('unloaded');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("CodeGraphy plugin 'acme.broken'"));
    result.registry.disposeAll();
  });

  it('unloads plugins registered before construction fails', async () => {
    const workspaceRoot = await createWorkspace();
    const onUnload = vi.fn();
    const plugin = {
      ...createTextPlugin({
        onPreAnalyze: vi.fn(),
        onPostAnalyze: vi.fn(),
        onWorkspaceReady: vi.fn(),
        analyzeFile: vi.fn(),
      }),
      onUnload,
    };
    const options = {
      workspaceRoot,
      plugins: [plugin, plugin],
      includeCorePlugins: false,
    };

    await expect(createWorkspaceIndexRegistry(
      options,
      readCodeGraphyWorkspaceSettings(workspaceRoot),
      workspaceRoot,
    )).rejects.toThrow(`Plugin with ID '${plugin.id}' is already registered`);

    expect(onUnload).toHaveBeenCalledOnce();
  });
});
