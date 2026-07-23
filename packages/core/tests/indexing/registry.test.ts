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
  it('continues registering provided plugins after one registration fails', async () => {
    const workspaceRoot = await createWorkspace();
    const warn = vi.fn();
    const broken = {
      ...createTextPlugin({
        onPreAnalyze: vi.fn(),
        onPostAnalyze: vi.fn(),
        onWorkspaceReady: vi.fn(),
        analyzeFile: vi.fn(),
      }),
      id: 'acme.broken',
      apiVersion: '^99.0.0',
      onUnload: vi.fn(),
    };
    const healthy = {
      ...createTextPlugin({
        onPreAnalyze: vi.fn(),
        onPostAnalyze: vi.fn(),
        onWorkspaceReady: vi.fn(),
        analyzeFile: vi.fn(),
      }),
      id: 'acme.healthy',
    };

    const result = await createWorkspaceIndexRegistry(
      {
        workspaceRoot,
        plugins: [broken, healthy],
        includeCorePlugins: false,
        warn,
      },
      readCodeGraphyWorkspaceSettings(workspaceRoot),
      workspaceRoot,
    );

    expect(result.registry.list().map(({ plugin }) => plugin.id)).toEqual(['acme.healthy']);
    expect(broken.onUnload).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("plugin 'acme.broken'"));
    result.registry.disposeAll();
  });

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

  it('does not unload an active runtime when the same provided instance is repeated', async () => {
    const workspaceRoot = await createWorkspace();
    const onUnload = vi.fn();
    const warn = vi.fn();
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
      warn,
    };

    const result = await createWorkspaceIndexRegistry(
      options,
      readCodeGraphyWorkspaceSettings(workspaceRoot),
      workspaceRoot,
    );

    expect(result.registry.list().map(info => info.plugin.id)).toEqual([plugin.id]);
    expect(onUnload).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining(
      `provided plugin '${plugin.id}' could not be registered`,
    ));
    result.registry.disposeAll();
    expect(onUnload).toHaveBeenCalledOnce();
  });
});
