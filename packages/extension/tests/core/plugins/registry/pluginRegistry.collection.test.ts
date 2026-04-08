import { describe, expect, it } from 'vitest';
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
});
