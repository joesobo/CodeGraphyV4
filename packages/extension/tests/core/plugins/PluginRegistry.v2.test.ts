import { describe, it, expect, vi } from 'vitest';
import { PluginRegistry } from '@/core/plugins/PluginRegistry';
import { EventBus } from '@/core/plugins/EventBus';
import { DecorationManager } from '@/core/plugins/DecorationManager';
import { ViewRegistry } from '@/core/views/ViewRegistry';
import { IPlugin } from '@/core/plugins/types';
import { CodeGraphyAPIImpl } from '@/core/plugins/CodeGraphyAPI';
import { IGraphData } from '@/shared/types';

/** Create a v2 plugin with all lifecycle hooks */
function createV2Plugin(id: string, overrides: Record<string, unknown> = {}): IPlugin & {
  apiVersion: string;
  onLoad: ReturnType<typeof vi.fn>;
  onUnload: ReturnType<typeof vi.fn>;
  onWorkspaceReady: ReturnType<typeof vi.fn>;
  onPreAnalyze: ReturnType<typeof vi.fn>;
  onPostAnalyze: ReturnType<typeof vi.fn>;
  onGraphRebuild: ReturnType<typeof vi.fn>;
  onWebviewReady: ReturnType<typeof vi.fn>;
} {
  return {
    id,
    name: `Test Plugin ${id}`,
    version: '1.0.0',
    apiVersion: '^2.0.0',
    supportedExtensions: ['.test'],
    detectConnections: vi.fn().mockResolvedValue([]),
    onLoad: vi.fn(),
    onUnload: vi.fn(),
    onWorkspaceReady: vi.fn(),
    onPreAnalyze: vi.fn(),
    onPostAnalyze: vi.fn(),
    onGraphRebuild: vi.fn(),
    onWebviewReady: vi.fn(),
    ...overrides,
  } as IPlugin & {
    apiVersion: string;
    onLoad: ReturnType<typeof vi.fn>;
    onUnload: ReturnType<typeof vi.fn>;
    onWorkspaceReady: ReturnType<typeof vi.fn>;
    onPreAnalyze: ReturnType<typeof vi.fn>;
    onPostAnalyze: ReturnType<typeof vi.fn>;
    onGraphRebuild: ReturnType<typeof vi.fn>;
    onWebviewReady: ReturnType<typeof vi.fn>;
  };
}

/** Create a v1 plugin (no apiVersion) */
function createV1Plugin(id: string): IPlugin {
  return {
    id,
    name: `V1 Plugin ${id}`,
    version: '1.0.0',
    supportedExtensions: ['.v1'],
    detectConnections: vi.fn().mockResolvedValue([]),
  };
}

/** Create a configured v2-ready registry */
function createConfiguredRegistry() {
  const eventBus = new EventBus();
  const decorationManager = new DecorationManager();
  const viewRegistry = new ViewRegistry();
  const graphProvider = vi.fn(() => ({ nodes: [], edges: [] }));
  const commandRegistrar = vi.fn(() => ({ dispose: vi.fn() }));
  const webviewSender = vi.fn();

  const registry = new PluginRegistry();
  registry.configureV2({
    eventBus,
    decorationManager,
    viewRegistry,
    graphProvider,
    commandRegistrar,
    webviewSender,
    workspaceRoot: '/workspace',
  });

  return { registry, eventBus, decorationManager, viewRegistry, graphProvider, commandRegistrar, webviewSender };
}

describe('PluginRegistry v2', () => {
  describe('v2 detection', () => {
    it('detects plugin with apiVersion field as v2', () => {
      const { registry } = createConfiguredRegistry();
      const plugin = createV2Plugin('v2-plugin');

      registry.register(plugin);

      const info = registry.get(plugin.id) as { isV2: boolean };
      expect(info.isV2).toBe(true);
    });

    it('detects plugin without apiVersion as v1', () => {
      const { registry } = createConfiguredRegistry();
      const plugin = createV1Plugin('v1-plugin');

      registry.register(plugin);

      const info = registry.get(plugin.id) as { isV2: boolean };
      expect(info.isV2).toBe(false);
    });

    it('does not treat non-string apiVersion as v2', () => {
      const { registry } = createConfiguredRegistry();
      const plugin = createV1Plugin('weird-plugin');
      // Add a numeric apiVersion (not a string)
      (plugin as Record<string, unknown>).apiVersion = 2;

      registry.register(plugin);

      const info = registry.get(plugin.id) as { isV2: boolean };
      expect(info.isV2).toBe(false);
    });

    it('rejects a plugin targeting a future core API major', () => {
      const { registry } = createConfiguredRegistry();
      const plugin = createV2Plugin('future-plugin', { apiVersion: '^3.0.0' });

      expect(() => registry.register(plugin)).toThrow(/future CodeGraphy Plugin API/);
      expect(registry.size).toBe(0);
    });

    it('rejects a plugin targeting an unsupported older core API major', () => {
      const { registry } = createConfiguredRegistry();
      const plugin = createV2Plugin('legacy-plugin', { apiVersion: '^1.0.0' });

      expect(() => registry.register(plugin)).toThrow(/unsupported CodeGraphy Plugin API/);
      expect(registry.size).toBe(0);
    });

    it('rejects malformed apiVersion strings', () => {
      const { registry } = createConfiguredRegistry();
      const plugin = createV2Plugin('bad-range-plugin', { apiVersion: 'latest' });

      expect(() => registry.register(plugin)).toThrow(/invalid apiVersion/);
      expect(registry.size).toBe(0);
    });

    it('warns on incompatible webviewApiVersion but still registers', () => {
      const { registry } = createConfiguredRegistry();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const plugin = createV2Plugin('webview-mismatch', {
        webviewApiVersion: '^2.0.0',
        webviewContributions: { scripts: ['dist/webview.js'] },
      });

      registry.register(plugin);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('incompatible webviewApiVersion')
      );
      expect(registry.size).toBe(1);
      warnSpy.mockRestore();
    });
  });

  describe('onLoad lifecycle', () => {
    it('calls onLoad(api) when a v2 plugin is registered', () => {
      const { registry } = createConfiguredRegistry();
      const plugin = createV2Plugin('load-test');

      registry.register(plugin);

      expect(plugin.onLoad).toHaveBeenCalledOnce();
      expect(plugin.onLoad).toHaveBeenCalledWith(expect.any(CodeGraphyAPIImpl));
    });

    it('does not call onLoad on a v1 plugin', () => {
      const { registry } = createConfiguredRegistry();
      const plugin = createV1Plugin('v1-load');
      const onLoad = vi.fn();
      (plugin as Record<string, unknown>).onLoad = onLoad;

      registry.register(plugin);

      expect(onLoad).not.toHaveBeenCalled();
    });

    it('handles onLoad errors gracefully', () => {
      const { registry } = createConfiguredRegistry();
      const plugin = createV2Plugin('error-load', {
        onLoad: vi.fn(() => { throw new Error('onLoad failed'); }),
      });

      // Should not throw
      expect(() => registry.register(plugin)).not.toThrow();
      expect(registry.size).toBe(1);
    });
  });

  describe('onUnload lifecycle', () => {
    it('calls onUnload() when a v2 plugin is unregistered', () => {
      const { registry } = createConfiguredRegistry();
      const plugin = createV2Plugin('unload-test');

      registry.register(plugin);
      registry.unregister(plugin.id);

      expect(plugin.onUnload).toHaveBeenCalledOnce();
    });

    it('does not call onUnload on a v1 plugin', () => {
      const { registry } = createConfiguredRegistry();
      const plugin = createV1Plugin('v1-unload');
      const onUnload = vi.fn();
      (plugin as Record<string, unknown>).onUnload = onUnload;

      registry.register(plugin);
      registry.unregister(plugin.id);

      expect(onUnload).not.toHaveBeenCalled();
    });

    it('handles onUnload errors gracefully', () => {
      const { registry } = createConfiguredRegistry();
      const plugin = createV2Plugin('error-unload', {
        onUnload: vi.fn(() => { throw new Error('onUnload failed'); }),
      });

      registry.register(plugin);

      // Should not throw
      expect(() => registry.unregister(plugin.id)).not.toThrow();
      expect(registry.size).toBe(0);
    });
  });

  describe('API cleanup on unregister', () => {
    it('calls disposeAll() on the plugin API when unregistering', () => {
      const { registry } = createConfiguredRegistry();
      const plugin = createV2Plugin('cleanup-test');

      registry.register(plugin);
      const api = registry.getPluginAPI(plugin.id)!;
      const disposeAllSpy = vi.spyOn(api, 'disposeAll');

      registry.unregister(plugin.id);

      expect(disposeAllSpy).toHaveBeenCalledOnce();
    });
  });

  describe('notifyWorkspaceReady', () => {
    it('calls onWorkspaceReady(graph) on all v2 plugins', () => {
      const { registry } = createConfiguredRegistry();
      const plugin1 = createV2Plugin('ws-ready-1', { supportedExtensions: ['.a'] });
      const plugin2 = createV2Plugin('ws-ready-2', { supportedExtensions: ['.b'] });

      registry.register(plugin1);
      registry.register(plugin2);

      const graph: IGraphData = { nodes: [{ id: 'x', label: 'x', color: '#fff' }], edges: [] };
      registry.notifyWorkspaceReady(graph);

      expect(plugin1.onWorkspaceReady).toHaveBeenCalledWith(graph);
      expect(plugin2.onWorkspaceReady).toHaveBeenCalledWith(graph);
    });

    it('skips v1 plugins', () => {
      const { registry } = createConfiguredRegistry();
      const v1Plugin = createV1Plugin('v1-ws');
      const onWorkspaceReady = vi.fn();
      (v1Plugin as Record<string, unknown>).onWorkspaceReady = onWorkspaceReady;

      registry.register(v1Plugin);
      registry.notifyWorkspaceReady({ nodes: [], edges: [] });

      expect(onWorkspaceReady).not.toHaveBeenCalled();
    });

    it('handles errors gracefully', () => {
      const { registry } = createConfiguredRegistry();
      const plugin = createV2Plugin('ws-error', {
        onWorkspaceReady: vi.fn(() => { throw new Error('boom'); }),
      });

      registry.register(plugin);

      expect(() => registry.notifyWorkspaceReady({ nodes: [], edges: [] })).not.toThrow();
    });
  });

  describe('notifyPreAnalyze', () => {
    it('calls onPreAnalyze(files, root) on all v2 plugins', async () => {
      const { registry } = createConfiguredRegistry();
      const plugin = createV2Plugin('pre-analyze', {
        onPreAnalyze: vi.fn().mockResolvedValue(undefined),
      });

      registry.register(plugin);

      const files = [{ absolutePath: '/workspace/a.ts', relativePath: 'a.ts', content: 'const x = 1;' }];
      await registry.notifyPreAnalyze(files, '/workspace');

      expect(plugin.onPreAnalyze).toHaveBeenCalledWith(files, '/workspace');
    });

    it('skips v1 plugins', async () => {
      const { registry } = createConfiguredRegistry();
      const v1Plugin = createV1Plugin('v1-pre');
      const onPreAnalyze = vi.fn();
      (v1Plugin as Record<string, unknown>).onPreAnalyze = onPreAnalyze;

      registry.register(v1Plugin);
      await registry.notifyPreAnalyze([], '/workspace');

      expect(onPreAnalyze).not.toHaveBeenCalled();
    });

    it('handles errors gracefully', async () => {
      const { registry } = createConfiguredRegistry();
      const plugin = createV2Plugin('pre-error', {
        onPreAnalyze: vi.fn().mockRejectedValue(new Error('pre-analyze failed')),
      });

      registry.register(plugin);

      await expect(registry.notifyPreAnalyze([], '/workspace')).resolves.toBeUndefined();
    });
  });

  describe('notifyPostAnalyze', () => {
    it('calls onPostAnalyze(graph) on all v2 plugins', () => {
      const { registry } = createConfiguredRegistry();
      const plugin = createV2Plugin('post-analyze');

      registry.register(plugin);

      const graph: IGraphData = { nodes: [], edges: [] };
      registry.notifyPostAnalyze(graph);

      expect(plugin.onPostAnalyze).toHaveBeenCalledWith(graph);
    });

    it('skips v1 plugins', () => {
      const { registry } = createConfiguredRegistry();
      const v1Plugin = createV1Plugin('v1-post');
      const onPostAnalyze = vi.fn();
      (v1Plugin as Record<string, unknown>).onPostAnalyze = onPostAnalyze;

      registry.register(v1Plugin);
      registry.notifyPostAnalyze({ nodes: [], edges: [] });

      expect(onPostAnalyze).not.toHaveBeenCalled();
    });

    it('handles errors gracefully', () => {
      const { registry } = createConfiguredRegistry();
      const plugin = createV2Plugin('post-error', {
        onPostAnalyze: vi.fn(() => { throw new Error('post-analyze failed'); }),
      });

      registry.register(plugin);

      expect(() => registry.notifyPostAnalyze({ nodes: [], edges: [] })).not.toThrow();
    });
  });

  describe('notifyGraphRebuild', () => {
    it('calls onGraphRebuild(graph) on all v2 plugins', () => {
      const { registry } = createConfiguredRegistry();
      const plugin = createV2Plugin('graph-rebuild');

      registry.register(plugin);

      const graph: IGraphData = {
        nodes: [{ id: 'a', label: 'a', color: '#fff' }],
        edges: [],
      };
      registry.notifyGraphRebuild(graph);

      expect(plugin.onGraphRebuild).toHaveBeenCalledWith(graph);
    });

    it('skips v1 plugins', () => {
      const { registry } = createConfiguredRegistry();
      const v1Plugin = createV1Plugin('v1-rebuild');
      const onGraphRebuild = vi.fn();
      (v1Plugin as Record<string, unknown>).onGraphRebuild = onGraphRebuild;

      registry.register(v1Plugin);
      registry.notifyGraphRebuild({ nodes: [], edges: [] });

      expect(onGraphRebuild).not.toHaveBeenCalled();
    });

    it('handles errors gracefully', () => {
      const { registry } = createConfiguredRegistry();
      const plugin = createV2Plugin('rebuild-error', {
        onGraphRebuild: vi.fn(() => { throw new Error('rebuild failed'); }),
      });

      registry.register(plugin);

      expect(() => registry.notifyGraphRebuild({ nodes: [], edges: [] })).not.toThrow();
    });
  });

  describe('notifyWebviewReady', () => {
    it('calls onWebviewReady() on all v2 plugins', () => {
      const { registry } = createConfiguredRegistry();
      const plugin1 = createV2Plugin('wv-ready-1', { supportedExtensions: ['.a'] });
      const plugin2 = createV2Plugin('wv-ready-2', { supportedExtensions: ['.b'] });

      registry.register(plugin1);
      registry.register(plugin2);

      registry.notifyWebviewReady();

      expect(plugin1.onWebviewReady).toHaveBeenCalledOnce();
      expect(plugin2.onWebviewReady).toHaveBeenCalledOnce();
    });

    it('skips v1 plugins', () => {
      const { registry } = createConfiguredRegistry();
      const v1Plugin = createV1Plugin('v1-wv');
      const onWebviewReady = vi.fn();
      (v1Plugin as Record<string, unknown>).onWebviewReady = onWebviewReady;

      registry.register(v1Plugin);
      registry.notifyWebviewReady();

      expect(onWebviewReady).not.toHaveBeenCalled();
    });

    it('handles errors gracefully', () => {
      const { registry } = createConfiguredRegistry();
      const plugin = createV2Plugin('wv-error', {
        onWebviewReady: vi.fn(() => { throw new Error('webview ready failed'); }),
      });

      registry.register(plugin);

      expect(() => registry.notifyWebviewReady()).not.toThrow();
    });
  });

  describe('v1 backward compatibility', () => {
    it('v1 plugin still registers and works for file analysis', async () => {
      const { registry } = createConfiguredRegistry();
      const connections = [{ specifier: './b', resolvedPath: '/b.v1', type: 'static' as const }];
      const v1Plugin = createV1Plugin('v1-compat');
      (v1Plugin.detectConnections as ReturnType<typeof vi.fn>).mockResolvedValue(connections);

      registry.register(v1Plugin);

      const result = await registry.analyzeFile('test.v1', 'content', '/workspace');
      expect(result).toEqual(connections);
    });

    it('v1 plugin lifecycle hooks are not called for notify methods', () => {
      const { registry } = createConfiguredRegistry();
      const v1Plugin = createV1Plugin('v1-lifecycle');

      registry.register(v1Plugin);

      // None of these should throw; they just skip v1 plugins
      registry.notifyWorkspaceReady({ nodes: [], edges: [] });
      registry.notifyPostAnalyze({ nodes: [], edges: [] });
      registry.notifyGraphRebuild({ nodes: [], edges: [] });
      registry.notifyWebviewReady();

      expect(registry.size).toBe(1);
    });

    it('v1 plugin dispose() is still called on unregister', () => {
      const { registry } = createConfiguredRegistry();
      const dispose = vi.fn();
      const v1Plugin = createV1Plugin('v1-dispose');
      v1Plugin.dispose = dispose;

      registry.register(v1Plugin);
      registry.unregister(v1Plugin.id);

      expect(dispose).toHaveBeenCalledOnce();
    });
  });

  describe('getPluginAPI', () => {
    it('returns the API for a v2 plugin', () => {
      const { registry } = createConfiguredRegistry();
      const plugin = createV2Plugin('api-get');

      registry.register(plugin);

      const api = registry.getPluginAPI(plugin.id);
      expect(api).toBeInstanceOf(CodeGraphyAPIImpl);
      expect(api?.pluginId).toBe('api-get');
    });

    it('returns undefined for a v1 plugin', () => {
      const { registry } = createConfiguredRegistry();
      const v1Plugin = createV1Plugin('v1-api');

      registry.register(v1Plugin);

      const api = registry.getPluginAPI(v1Plugin.id);
      expect(api).toBeUndefined();
    });

    it('returns undefined for a non-existent plugin', () => {
      const { registry } = createConfiguredRegistry();

      const api = registry.getPluginAPI('nonexistent');
      expect(api).toBeUndefined();
    });
  });

  describe('Event emission', () => {
    it('emits plugin:registered event when a plugin is registered', () => {
      const { registry, eventBus } = createConfiguredRegistry();
      const handler = vi.fn();
      eventBus.on('plugin:registered', handler);

      const plugin = createV2Plugin('event-reg');
      registry.register(plugin);

      expect(handler).toHaveBeenCalledWith({ pluginId: 'event-reg' });
    });

    it('emits plugin:unregistered event when a plugin is unregistered', () => {
      const { registry, eventBus } = createConfiguredRegistry();
      const handler = vi.fn();
      eventBus.on('plugin:unregistered', handler);

      const plugin = createV2Plugin('event-unreg');
      registry.register(plugin);
      registry.unregister(plugin.id);

      expect(handler).toHaveBeenCalledWith({ pluginId: 'event-unreg' });
    });

    it('emits plugin:registered for v1 plugins too', () => {
      const { registry, eventBus } = createConfiguredRegistry();
      const handler = vi.fn();
      eventBus.on('plugin:registered', handler);

      const v1Plugin = createV1Plugin('v1-event');
      registry.register(v1Plugin);

      expect(handler).toHaveBeenCalledWith({ pluginId: 'v1-event' });
    });
  });

  describe('v2 without configureV2', () => {
    it('registers v2 plugin without API if configureV2 was not called', () => {
      const registry = new PluginRegistry();
      const plugin = createV2Plugin('no-config');

      // Should not throw — just won't create the API
      registry.register(plugin);

      expect(registry.size).toBe(1);
      expect(registry.getPluginAPI(plugin.id)).toBeUndefined();
      // onLoad should not have been called since API was not created
      expect(plugin.onLoad).not.toHaveBeenCalled();
    });
  });

  describe('mixed v1 and v2 plugins', () => {
    it('handles a mix of v1 and v2 plugins correctly', () => {
      const { registry } = createConfiguredRegistry();
      const v1 = createV1Plugin('mixed-v1');
      const v2 = createV2Plugin('mixed-v2', { supportedExtensions: ['.v2'] });

      registry.register(v1);
      registry.register(v2);

      expect(registry.size).toBe(2);
      expect(registry.getPluginAPI('mixed-v1')).toBeUndefined();
      expect(registry.getPluginAPI('mixed-v2')).toBeInstanceOf(CodeGraphyAPIImpl);

      // Lifecycle notifications only affect v2
      const graph: IGraphData = { nodes: [], edges: [] };
      registry.notifyWorkspaceReady(graph);
      expect(v2.onWorkspaceReady).toHaveBeenCalledWith(graph);
    });
  });
});
