import { describe, expect, it, vi } from 'vitest';
import { createConfiguredRegistry, createMockPlugin } from './pluginRegistry.testSupport';

describe('PluginRegistry collection', () => {
  it('returns all registered plugins', () => {
    const registry = createConfiguredRegistry();
    const plugin1 = createMockPlugin({ id: 'first' });
    const plugin2 = createMockPlugin({ id: 'second' });

    registry.register(plugin1);
    registry.register(plugin2);

    const result = registry.list();

    expect(result).toHaveLength(2);
    expect(result.map((pluginInfo) => pluginInfo.plugin.id)).toContain('first');
    expect(result.map((pluginInfo) => pluginInfo.plugin.id)).toContain('second');
  });

  it('exposes plugin lookup, size, api, and file support helpers from the collection surface', () => {
    const registry = createConfiguredRegistry();
    const plugin = createMockPlugin({
      id: 'typescript',
      supportedExtensions: ['.ts'],
    });

    registry.register(plugin);

    expect(registry.get('typescript')?.plugin).toBe(plugin);
    expect(registry.size).toBe(1);
    expect(registry.getPluginAPI('typescript')).toEqual(
      expect.objectContaining({ version: '2.0.0' }),
    );
    expect(registry.supportsFile('src/app.ts')).toBe(true);
    expect(registry.supportsFile('src/app.py')).toBe(false);
  });

  it('reorders registry listing and extension routing when plugin order changes', () => {
    const registry = createConfiguredRegistry();
    const first = createMockPlugin({ id: 'first', supportedExtensions: ['.ts'] });
    const second = createMockPlugin({ id: 'second', supportedExtensions: ['.ts'] });
    const third = createMockPlugin({ id: 'third', supportedExtensions: ['.md'] });

    registry.register(first);
    registry.register(second);
    registry.register(third);
    registry.setPluginOrder(['second', 'missing', 'first']);

    expect(registry.list().map((pluginInfo) => pluginInfo.plugin.id)).toEqual([
      'second',
      'first',
      'third',
    ]);
    expect(registry.getPluginForFile('app.ts')?.id).toBe('second');
    expect(registry.getPluginsForExtension('.ts').map((plugin) => plugin.id)).toEqual([
      'second',
      'first',
    ]);
  });

  it('returns empty array when no plugins are registered', () => {
    const registry = createConfiguredRegistry();

    expect(registry.list()).toEqual([]);
  });

  it('returns all supported extensions', () => {
    const registry = createConfiguredRegistry();
    const plugin1 = createMockPlugin({ id: 'ts', supportedExtensions: ['.ts', '.tsx'] });
    const plugin2 = createMockPlugin({ id: 'js', supportedExtensions: ['.js'] });

    registry.register(plugin1);
    registry.register(plugin2);

    expect(registry.getSupportedExtensions()).toEqual(expect.arrayContaining(['.ts', '.tsx', '.js']));
  });

  it('returns empty extension list when no plugins are registered', () => {
    const registry = createConfiguredRegistry();

    expect(registry.getSupportedExtensions()).toEqual([]);
  });

  it('returns plugin-contributed node types', () => {
    const registry = createConfiguredRegistry();
    registry.register(createMockPlugin({
      id: 'first',
      contributeNodeTypes: () => [
        {
          id: 'route',
          label: 'Route',
          defaultColor: '#00ff00',
          defaultVisible: true,
        },
      ],
    }));
    registry.register(createMockPlugin({
      id: 'second',
      contributeNodeTypes: () => [
        {
          id: 'tool',
          label: 'Tool',
          defaultColor: '#0000ff',
          defaultVisible: true,
        },
      ],
    }));

    expect(registry.listNodeTypes()).toEqual([
      {
        id: 'route',
        label: 'Route',
        defaultColor: '#00ff00',
        defaultVisible: true,
      },
      {
        id: 'tool',
        label: 'Tool',
        defaultColor: '#0000ff',
        defaultVisible: true,
      },
    ]);
  });

  it('ignores plugins without node-type contributions when listing node types', () => {
    const registry = createConfiguredRegistry();
    registry.register(createMockPlugin({ id: 'noop' }));
    registry.register(createMockPlugin({
      id: 'routes',
      contributeNodeTypes: () => [
        {
          id: 'import',
          label: 'Import',
          defaultColor: '#22C55E',
          defaultVisible: true,
        },
      ],
    }));

    expect(registry.listNodeTypes()).toEqual([
      {
        id: 'import',
        label: 'Import',
        defaultColor: '#22C55E',
        defaultVisible: true,
      },
    ]);
  });

  it('returns plugin-contributed edge types with later plugins overriding duplicate ids', () => {
    const registry = createConfiguredRegistry();
    registry.register(createMockPlugin({
      id: 'first',
      contributeEdgeTypes: () => [
        {
          id: 'call',
          label: 'Calls',
          defaultColor: '#ff0000',
          defaultVisible: true,
        },
      ],
    }));
    registry.register(createMockPlugin({
      id: 'second',
      contributeEdgeTypes: () => [
        {
          id: 'call',
          label: 'Calls Override',
          defaultColor: '#ffaa00',
          defaultVisible: false,
        },
        {
          id: 'test',
          label: 'Tests',
          defaultColor: '#00aaff',
          defaultVisible: true,
        },
      ],
    }));

    expect(registry.listEdgeTypes()).toEqual([
      {
        id: 'call',
        label: 'Calls Override',
        defaultColor: '#ffaa00',
        defaultVisible: false,
      },
      {
        id: 'test',
        label: 'Tests',
        defaultColor: '#00aaff',
        defaultVisible: true,
      },
    ]);
  });

  it('ignores plugins without edge-type contributions when listing edge types', () => {
    const registry = createConfiguredRegistry();
    registry.register(createMockPlugin({ id: 'noop' }));
    registry.register(createMockPlugin({
      id: 'routes',
      contributeEdgeTypes: () => [
        {
          id: 'import',
          label: 'Import',
          defaultColor: '#22C55E',
          defaultVisible: true,
        },
      ],
    }));

    expect(registry.listEdgeTypes()).toEqual([
      {
        id: 'import',
        label: 'Import',
        defaultColor: '#22C55E',
        defaultVisible: true,
      },
    ]);
  });

  it('does not reorder when plugin order is empty or only one plugin is registered', () => {
    const registry = createConfiguredRegistry();
    registry.register(createMockPlugin({ id: 'solo', supportedExtensions: ['.ts'] }));

    registry.setPluginOrder(undefined);
    registry.setPluginOrder([]);
    registry.setPluginOrder(['solo']);

    expect(registry.list().map((pluginInfo) => pluginInfo.plugin.id)).toEqual(['solo']);
    expect(registry.getPluginForFile('app.ts')?.id).toBe('solo');
  });

  it('does not reorder when plugin ids are omitted or empty for a multi-plugin registry', () => {
    const registry = createConfiguredRegistry();
    registry.register(createMockPlugin({ id: 'first', supportedExtensions: ['.ts'] }));
    registry.register(createMockPlugin({ id: 'second', supportedExtensions: ['.ts'] }));

    registry.setPluginOrder(undefined);
    expect(registry.list().map((pluginInfo) => pluginInfo.plugin.id)).toEqual(['first', 'second']);

    registry.setPluginOrder([]);
    expect(registry.list().map((pluginInfo) => pluginInfo.plugin.id)).toEqual(['first', 'second']);
  });

  it('does not reorder a single-plugin registry even when a plugin order is provided', () => {
    const registry = createConfiguredRegistry();
    registry.register(createMockPlugin({ id: 'solo', supportedExtensions: ['.ts'] }));

    registry.setPluginOrder(['missing', 'solo']);

    expect(registry.list().map((pluginInfo) => pluginInfo.plugin.id)).toEqual(['solo']);
  });

  it('disposes every registered plugin through unregister', () => {
    const registry = createConfiguredRegistry();
    registry.register(createMockPlugin({ id: 'first' }));
    registry.register(createMockPlugin({ id: 'second' }));
    const unregisterSpy = vi.spyOn(registry, 'unregister');

    registry.disposeAll();

    expect(unregisterSpy).toHaveBeenCalledTimes(2);
    expect(unregisterSpy).toHaveBeenNthCalledWith(1, 'first');
    expect(unregisterSpy).toHaveBeenNthCalledWith(2, 'second');
    expect(registry.size).toBe(0);
  });

  it('replays readiness only for a known deferred plugin', () => {
    const registry = createConfiguredRegistry();
    const readyGraph = { nodes: [{ id: 'graph', label: 'graph', color: '#fff' }], edges: [] };
    const plugin = createMockPlugin({
      id: 'late',
      onWorkspaceReady: vi.fn(),
      onWebviewReady: vi.fn(),
    });

    registry.notifyWorkspaceReady(readyGraph);
    registry.notifyWebviewReady();
    registry.register(plugin, { deferReadinessReplay: true });

    registry.replayReadinessForPlugin('missing');
    registry.replayReadinessForPlugin('late');

    expect(plugin.onWorkspaceReady).toHaveBeenCalledOnce();
    expect(plugin.onWorkspaceReady).toHaveBeenCalledWith(readyGraph);
    expect(plugin.onWebviewReady).toHaveBeenCalledOnce();
  });
});
