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
      expect.objectContaining({ version: '2.2.0' }),
    );
    expect(registry.supportsFile('src/app.ts')).toBe(true);
    expect(registry.supportsFile('src/app.py')).toBe(false);
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

  it('includes core graph scope capabilities without treating core analysis as a plugin', () => {
    const registry = createConfiguredRegistry();
    registry.setCoreGraphScopeCapabilitiesProvider((filePaths) => {
      expect(filePaths).toEqual(['src/app.cpp']);
      return {
        nodeTypes: ['symbol:function', 'symbol:class'],
        edgeTypes: ['import', 'call', 'contains', 'inherit', 'overrides'],
      };
    });

    expect(registry.list()).toEqual([]);
    expect(registry.listGraphScopeCapabilities(['src/app.cpp'])).toEqual({
      nodeTypes: ['symbol:function', 'symbol:class'],
      edgeTypes: ['import', 'call', 'contains', 'inherit', 'overrides'],
    });
  });

  it('excludes disabled plugins from file analysis', async () => {
    const registry = createConfiguredRegistry();
    const analyzeFile = vi.fn(async (filePath: string) => ({
      filePath,
      relations: [],
    }));
    registry.register(createMockPlugin({
      id: 'plugin.disabled',
      supportedExtensions: ['.ts'],
      analyzeFile,
    }));

    await expect(
      registry.analyzeFileResult(
        '/workspace/src/app.ts',
        "import './target'",
        '/workspace',
        undefined,
        { disabledPlugins: new Set(['plugin.disabled']) },
      ),
    ).resolves.toBeNull();

    expect(analyzeFile).not.toHaveBeenCalled();
  });

  it('excludes disabled plugins from targeted file analysis', async () => {
    const registry = createConfiguredRegistry();
    const analyzeFile = vi.fn(async (filePath: string) => ({
      filePath,
      relations: [],
    }));
    registry.register(createMockPlugin({
      id: 'plugin.disabled',
      supportedExtensions: ['.ts'],
      analyzeFile,
    }));

    await expect(
      registry.analyzeFileResultForPlugins(
        '/workspace/src/app.ts',
        "import './target'",
        '/workspace',
        ['plugin.disabled'],
        undefined,
        { disabledPlugins: new Set(['plugin.disabled']) },
      ),
    ).resolves.toBeNull();

    expect(analyzeFile).not.toHaveBeenCalled();
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

  it('returns graph scope capabilities from plugins that support workspace files', () => {
    const registry = createConfiguredRegistry();
    const readTypeScriptCapabilities = vi.fn(() =>
      ({
        nodeTypes: ['symbol:function', 'symbol:interface'],
        edgeTypes: ['import', 'plugin:route'],
      }) as const
    );
    registry.register(createMockPlugin({
      id: 'typescript',
      supportedExtensions: ['.ts'],
      contributeGraphScopeCapabilities: readTypeScriptCapabilities,
    }));
    registry.register(createMockPlugin({
      id: 'python',
      supportedExtensions: ['.py'],
      contributeGraphScopeCapabilities: () => ({ edgeTypes: ['reference'] }),
    }));
    registry.register(createMockPlugin({
      id: 'wildcard',
      supportedExtensions: ['*'],
      contributeGraphScopeCapabilities: () => ({
        nodeTypes: ['plugin:test-node'],
        edgeTypes: ['plugin:test'],
      }),
    }));

    expect(registry.listGraphScopeCapabilities(['src/app.ts'])).toEqual({
      nodeTypes: ['symbol:function', 'symbol:interface', 'plugin:test-node'],
      edgeTypes: ['import', 'plugin:route', 'plugin:test'],
    });
    expect(readTypeScriptCapabilities).toHaveBeenCalledWith({
      filePaths: ['src/app.ts'],
    });
  });

  it('passes only each plugin applicable workspace files into graph scope capabilities', () => {
    const registry = createConfiguredRegistry();
    const readTypeScriptCapabilities = vi.fn(() => ({ edgeTypes: ['import'] }) as const);
    const readSvelteCapabilities = vi.fn(() => ({ edgeTypes: ['call'] }) as const);

    registry.register(createMockPlugin({
      id: 'typescript',
      supportedExtensions: ['.ts'],
      contributeGraphScopeCapabilities: readTypeScriptCapabilities,
    }));
    registry.register(createMockPlugin({
      id: 'svelte',
      supportedExtensions: ['.svelte'],
      contributeGraphScopeCapabilities: readSvelteCapabilities,
    }));

    expect(registry.listGraphScopeCapabilities(['src/app.ts', 'src/App.svelte'])).toEqual({
      nodeTypes: [],
      edgeTypes: ['import', 'call'],
    });
    expect(readTypeScriptCapabilities).toHaveBeenCalledWith({ filePaths: ['src/app.ts'] });
    expect(readSvelteCapabilities).toHaveBeenCalledWith({ filePaths: ['src/App.svelte'] });
  });

  it('deduplicates graph scope capabilities when multiple applicable plugins declare the same kind', () => {
    const registry = createConfiguredRegistry();
    registry.register(createMockPlugin({
      id: 'first',
      supportedExtensions: ['.ts'],
      contributeGraphScopeCapabilities: () => ({
        nodeTypes: ['symbol:function', 'symbol:interface'],
        edgeTypes: ['import', 'reference'],
      }),
    }));
    registry.register(createMockPlugin({
      id: 'second',
      supportedExtensions: ['.tsx'],
      contributeGraphScopeCapabilities: () => ({
        nodeTypes: ['symbol:function', 'symbol:class'],
        edgeTypes: ['import', 'call'],
      }),
    }));

    expect(registry.listGraphScopeCapabilities(['src/app.ts', 'src/view.tsx'])).toEqual({
      nodeTypes: ['symbol:function', 'symbol:interface', 'symbol:class'],
      edgeTypes: ['import', 'reference', 'call'],
    });
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

  it('reports plugin availability through registered access providers', async () => {
    const registry = createConfiguredRegistry();
    const getAccess = vi.fn(async ({ access, pluginId, workspaceRoot }) => ({
      access,
      reason: `${pluginId}:${workspaceRoot}`,
      state: 'granted' as const,
    }));
    registry.register(createMockPlugin({
      id: 'pro-plugin',
      accessProvider: {
        id: 'pro-access',
        provides: ['pro'],
        getAccess,
      },
      requiresAccess: 'pro',
    }));

    await expect(registry.getPluginAvailability('missing')).resolves.toBeUndefined();
    await expect(registry.getPluginAvailability('pro-plugin', { workspaceRoot: '/workspace' })).resolves.toEqual({
      pluginId: 'pro-plugin',
      available: true,
      access: [{
        access: 'pro',
        reason: 'pro-plugin:/workspace',
        state: 'granted',
      }],
    });
    expect(getAccess).toHaveBeenCalledWith({
      access: 'pro',
      pluginId: 'pro-plugin',
      workspaceRoot: '/workspace',
    });
  });

  it('lists only graph view contributions available to the registry access context', async () => {
    const registry = createConfiguredRegistry();
    const availableContribution = {
      id: 'available-section',
      label: 'Available Section',
      createNodes: vi.fn(() => []),
    };
    const lockedContribution = {
      id: 'locked-section',
      label: 'Locked Section',
      requiresAccess: 'locked',
      createNodes: vi.fn(() => []),
    };

    registry.register(createMockPlugin({
      id: 'organize',
      accessProvider: {
        id: 'organize-access',
        provides: ['pro'],
        getAccess: vi.fn(async ({ access }) => ({ access, state: 'granted' as const })),
      },
      graphView: {
        runtimeNodes: [availableContribution, lockedContribution],
      },
    }));

    await expect(registry.listAvailableGraphViewContributions()).resolves.toEqual(expect.objectContaining({
      runtimeNodes: [{
        pluginId: 'organize',
        contribution: availableContribution,
      }],
    }));
  });
});
