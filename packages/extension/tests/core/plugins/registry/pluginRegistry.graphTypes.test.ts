import { describe, expect, it } from 'vitest';
import { createConfiguredRegistry, createMockPlugin } from './pluginRegistry.testSupport';

describe('PluginRegistry graph type contributions', () => {
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

  it('excludes disabled plugins from graph type and capability contributions', () => {
    const registry = createConfiguredRegistry();
    const disabledPlugins = new Set(['godot']);
    registry.register(createMockPlugin({
      id: 'godot',
      supportedExtensions: ['.gd'],
      contributeNodeTypes: () => [
        {
          id: 'godot-scene',
          label: 'Godot Scene',
          defaultColor: '#478CBF',
          defaultVisible: true,
        },
      ],
      contributeEdgeTypes: () => [
        {
          id: 'load',
          label: 'Loads',
          defaultColor: '#478CBF',
          defaultVisible: true,
        },
      ],
      contributeGraphScopeCapabilities: () => ({
        nodeTypes: ['plugin:codegraphy.gdscript:symbol:godot-class-name'],
        edgeTypes: ['load'],
      }),
    }));
    registry.register(createMockPlugin({
      id: 'typescript',
      supportedExtensions: ['.ts'],
      contributeNodeTypes: () => [
        {
          id: 'route',
          label: 'Route',
          defaultColor: '#00ff00',
          defaultVisible: true,
        },
      ],
      contributeEdgeTypes: () => [
        {
          id: 'plugin:route',
          label: 'Route',
          defaultColor: '#00ff00',
          defaultVisible: true,
        },
      ],
      contributeGraphScopeCapabilities: () => ({
        nodeTypes: ['route'],
        edgeTypes: ['plugin:route'],
      }),
    }));

    expect(registry.listNodeTypes(disabledPlugins)).toEqual([
      {
        id: 'route',
        label: 'Route',
        defaultColor: '#00ff00',
        defaultVisible: true,
      },
    ]);
    expect(registry.listEdgeTypes(disabledPlugins)).toEqual([
      {
        id: 'plugin:route',
        label: 'Route',
        defaultColor: '#00ff00',
        defaultVisible: true,
      },
    ]);
    expect(registry.listGraphScopeCapabilities(['game/player.gd', 'src/app.ts'], disabledPlugins)).toEqual({
      nodeTypes: ['route'],
      edgeTypes: ['plugin:route'],
    });
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
          id: 'plugin:verify',
          label: 'Verifies',
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
        id: 'plugin:verify',
        label: 'Verifies',
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
});
