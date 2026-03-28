import { describe, it, expect, vi } from 'vitest';
import { PluginRegistry } from '@/core/plugins/registry';
import { EventBus } from '@/core/plugins/eventBus';
import { DecorationManager } from '@/core/plugins/decorationManager';
import { ViewRegistry } from '@/core/views/registry';
import { IPlugin } from '@/core/plugins/types';
import { CodeGraphyAPIImpl } from '@/core/plugins/codeGraphyApi';
import { IGraphData } from '@/shared/contracts';

function createV2Plugin(id: string, overrides: Record<string, unknown> = {}): IPlugin & {
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
    onLoad: ReturnType<typeof vi.fn>;
    onUnload: ReturnType<typeof vi.fn>;
    onWorkspaceReady: ReturnType<typeof vi.fn>;
    onPreAnalyze: ReturnType<typeof vi.fn>;
    onPostAnalyze: ReturnType<typeof vi.fn>;
    onGraphRebuild: ReturnType<typeof vi.fn>;
    onWebviewReady: ReturnType<typeof vi.fn>;
  };
}

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

  return { registry, eventBus };
}

describe('PluginRegistry v2', () => {
  describe('registration contract', () => {
    it('registers without configureV2 but does not create scoped API', () => {
      const registry = new PluginRegistry();
      const plugin = createV2Plugin('no-config');

      expect(() => registry.register(plugin)).not.toThrow();
      expect(registry.size).toBe(1);
      expect(registry.getPluginAPI(plugin.id)).toBeUndefined();
      expect(plugin.onLoad).not.toHaveBeenCalled();
    });

    it('requires apiVersion to be a string', () => {
      const { registry } = createConfiguredRegistry();
      const plugin = createV2Plugin('missing-api') as unknown as Record<string, unknown>;
      delete plugin.apiVersion;

      expect(() => registry.register(plugin as unknown as IPlugin)).toThrow(/must declare a string apiVersion/);
      expect(registry.size).toBe(0);
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

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('incompatible webviewApiVersion'));
      expect(registry.size).toBe(1);
      warnSpy.mockRestore();
    });

    it('replays onWorkspaceReady for plugins registered after readiness', () => {
      const { registry } = createConfiguredRegistry();
      const graph: IGraphData = { nodes: [{ id: 'a', label: 'a', color: '#fff' }], edges: [] };
      registry.notifyWorkspaceReady(graph);

      const latePlugin = createV2Plugin('late-workspace-ready');
      registry.register(latePlugin);

      expect(latePlugin.onWorkspaceReady).toHaveBeenCalledWith(graph);
    });

    it('replays onWebviewReady for plugins registered after webview readiness', () => {
      const { registry } = createConfiguredRegistry();
      registry.notifyWebviewReady();

      const latePlugin = createV2Plugin('late-webview-ready');
      registry.register(latePlugin);

      expect(latePlugin.onWebviewReady).toHaveBeenCalledOnce();
    });

    it('supports deferred readiness replay for late-registered plugins', () => {
      const { registry } = createConfiguredRegistry();
      const graph: IGraphData = { nodes: [{ id: 'b', label: 'b', color: '#fff' }], edges: [] };
      registry.notifyWorkspaceReady(graph);
      registry.notifyWebviewReady();

      const latePlugin = createV2Plugin('late-deferred');
      registry.register(latePlugin, { deferReadinessReplay: true });

      expect(latePlugin.onWorkspaceReady).not.toHaveBeenCalled();
      expect(latePlugin.onWebviewReady).not.toHaveBeenCalled();

      registry.replayReadinessForPlugin(latePlugin.id);

      expect(latePlugin.onWorkspaceReady).toHaveBeenCalledWith(graph);
      expect(latePlugin.onWebviewReady).toHaveBeenCalledOnce();
    });

    it('replays onWorkspaceReady with the latest analyzed/rebuilt graph snapshot', () => {
      const { registry } = createConfiguredRegistry();
      const initial: IGraphData = { nodes: [{ id: 'initial', label: 'initial', color: '#fff' }], edges: [] };
      const analyzed: IGraphData = { nodes: [{ id: 'analyzed', label: 'analyzed', color: '#fff' }], edges: [] };
      const rebuilt: IGraphData = { nodes: [{ id: 'rebuilt', label: 'rebuilt', color: '#fff' }], edges: [] };

      registry.notifyWorkspaceReady(initial);
      registry.notifyPostAnalyze(analyzed);
      registry.notifyGraphRebuild(rebuilt);

      const latePlugin = createV2Plugin('late-latest-snapshot');
      registry.register(latePlugin);

      expect(latePlugin.onWorkspaceReady).toHaveBeenCalledWith(rebuilt);
    });
  });

  describe('lifecycle hooks', () => {
    it('calls onLoad(api) when a plugin is registered', () => {
      const { registry } = createConfiguredRegistry();
      const plugin = createV2Plugin('load-test');

      registry.register(plugin);

      expect(plugin.onLoad).toHaveBeenCalledOnce();
      expect(plugin.onLoad).toHaveBeenCalledWith(expect.any(CodeGraphyAPIImpl));
    });

    it('calls onUnload() and disposes scoped API when plugin is unregistered', () => {
      const { registry } = createConfiguredRegistry();
      const plugin = createV2Plugin('unload-test');

      registry.register(plugin);
      const api = registry.getPluginAPI(plugin.id)!;
      const disposeAllSpy = vi.spyOn(api, 'disposeAll');

      registry.unregister(plugin.id);

      expect(plugin.onUnload).toHaveBeenCalledOnce();
      expect(disposeAllSpy).toHaveBeenCalledOnce();
    });

    it('handles onLoad/onUnload errors gracefully', () => {
      const { registry } = createConfiguredRegistry();
      const plugin = createV2Plugin('hook-errors', {
        onLoad: vi.fn(() => {
          throw new Error('onLoad failed');
        }),
        onUnload: vi.fn(() => {
          throw new Error('onUnload failed');
        }),
      });

      expect(() => registry.register(plugin)).not.toThrow();
      expect(() => registry.unregister(plugin.id)).not.toThrow();
    });

    it('initializes a late-registered plugin exactly once', async () => {
      const { registry } = createConfiguredRegistry();
      const initialize = vi.fn().mockResolvedValue(undefined);
      const plugin = createV2Plugin('late-init', { initialize });

      registry.register(plugin);
      await registry.initializePlugin(plugin.id, '/workspace');
      await registry.initializePlugin(plugin.id, '/workspace');

      expect(initialize).toHaveBeenCalledTimes(1);
      expect(initialize).toHaveBeenCalledWith('/workspace');
    });
  });

  describe('notification hooks', () => {
    it('calls all notification hooks on registered plugins', async () => {
      const { registry } = createConfiguredRegistry();
      const plugin = createV2Plugin('notify-all');
      const graph: IGraphData = { nodes: [{ id: 'x', label: 'x', color: '#fff' }], edges: [] };
      const files = [{ absolutePath: '/workspace/a.ts', relativePath: 'a.ts', content: 'const x = 1;' }];

      registry.register(plugin);
      registry.notifyWorkspaceReady(graph);
      await registry.notifyPreAnalyze(files, '/workspace');
      registry.notifyPostAnalyze(graph);
      registry.notifyGraphRebuild(graph);
      registry.notifyWebviewReady();

      expect(plugin.onWorkspaceReady).toHaveBeenCalledWith(graph);
      expect(plugin.onPreAnalyze).toHaveBeenCalledWith(files, '/workspace');
      expect(plugin.onPostAnalyze).toHaveBeenCalledWith(graph);
      expect(plugin.onGraphRebuild).toHaveBeenCalledWith(graph);
      expect(plugin.onWebviewReady).toHaveBeenCalledOnce();
    });

    it('handles notification hook errors gracefully', async () => {
      const { registry } = createConfiguredRegistry();
      const plugin = createV2Plugin('notify-errors', {
        onWorkspaceReady: vi.fn(() => {
          throw new Error('ws');
        }),
        onPreAnalyze: vi.fn().mockRejectedValue(new Error('pre')),
        onPostAnalyze: vi.fn(() => {
          throw new Error('post');
        }),
        onGraphRebuild: vi.fn(() => {
          throw new Error('rebuild');
        }),
        onWebviewReady: vi.fn(() => {
          throw new Error('webview');
        }),
      });

      registry.register(plugin);
      expect(() => registry.notifyWorkspaceReady({ nodes: [], edges: [] })).not.toThrow();
      await expect(registry.notifyPreAnalyze([], '/workspace')).resolves.toBeUndefined();
      expect(() => registry.notifyPostAnalyze({ nodes: [], edges: [] })).not.toThrow();
      expect(() => registry.notifyGraphRebuild({ nodes: [], edges: [] })).not.toThrow();
      expect(() => registry.notifyWebviewReady()).not.toThrow();
    });
  });

  describe('getPluginAPI', () => {
    it('returns the API for a registered plugin', () => {
      const { registry } = createConfiguredRegistry();
      const plugin = createV2Plugin('api-get');

      registry.register(plugin);

      const api = registry.getPluginAPI(plugin.id);
      expect(api).toBeInstanceOf(CodeGraphyAPIImpl);
      expect(api?.pluginId).toBe('api-get');
    });

    it('returns undefined for a non-existent plugin', () => {
      const { registry } = createConfiguredRegistry();
      expect(registry.getPluginAPI('missing')).toBeUndefined();
    });
  });

  describe('event emission', () => {
    it('emits plugin:registered and plugin:unregistered events', () => {
      const { registry, eventBus } = createConfiguredRegistry();
      const registered = vi.fn();
      const unregistered = vi.fn();
      eventBus.on('plugin:registered', registered);
      eventBus.on('plugin:unregistered', unregistered);

      const plugin = createV2Plugin('eventful');
      registry.register(plugin);
      registry.unregister(plugin.id);

      expect(registered).toHaveBeenCalledWith({ pluginId: 'eventful' });
      expect(unregistered).toHaveBeenCalledWith({ pluginId: 'eventful' });
    });
  });
});
