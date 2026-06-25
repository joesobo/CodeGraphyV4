import { CodeGraphyAPIImpl } from '@/core/plugins/api/instance';
import { DecorationManager } from '@/core/plugins/decoration/manager';
import { EventBus } from '@/core/plugins/events/bus';
import { PluginRegistry } from '@/core/plugins/registry/manager';
import { IPlugin } from '@/core/plugins/types/contracts';
import { ViewRegistry } from '@/core/views/registry';
import type { IGraphData } from '@/shared/graph/contracts';
import { describe, expect, it, vi } from 'vitest';

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
    analyzeFile: vi.fn(async (filePath: string) => ({ filePath, relations: [] })),
    onLoad: vi.fn(),
    onUnload: vi.fn(),
    onWorkspaceReady: vi.fn(),
    onPreAnalyze: vi.fn(),
    onPostAnalyze: vi.fn(),
    onGraphRebuild: vi.fn(),
    onWebviewReady: vi.fn(),
    ...overrides,
  } as unknown as IPlugin & {
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
  describe('notification hooks', () => {

        it('calls all notification hooks on registered plugins', async () => {
          const { registry } = createConfiguredRegistry();
          const plugin = createV2Plugin('notify-all');
          const graph: IGraphData = { nodes: [{ id: 'x', label: 'x', color: '#fff' }], edges: [] };
          const files = [{ absolutePath: '/workspace/a.test', relativePath: 'a.test', content: 'const x = 1;' }];

          registry.register(plugin);
          registry.notifyWorkspaceReady(graph);
          await registry.notifyPreAnalyze(files, '/workspace');
          registry.notifyPostAnalyze(graph);
          registry.notifyGraphRebuild(graph);
          registry.notifyWebviewReady();

          expect(plugin.onWorkspaceReady).toHaveBeenCalledWith(graph);
          expect(plugin.onPreAnalyze).toHaveBeenCalledWith(
            files,
            '/workspace',
            expect.objectContaining({ mode: 'workspace' }),
          );
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
