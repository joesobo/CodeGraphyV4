import { describe, expect, it, vi } from 'vitest';
import { createConfiguredRegistry, createMockPlugin } from './pluginRegistry.testSupport';

describe('PluginRegistry graph scope capabilities', () => {
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
});
