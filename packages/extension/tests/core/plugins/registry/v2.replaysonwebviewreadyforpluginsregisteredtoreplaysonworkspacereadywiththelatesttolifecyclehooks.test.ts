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
  describe('registration contract', () => {


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
          expect(initialize).toHaveBeenCalledWith(
            '/workspace',
            expect.objectContaining({ fileSystem: expect.any(Object) }),
          );
        });
  });
});
