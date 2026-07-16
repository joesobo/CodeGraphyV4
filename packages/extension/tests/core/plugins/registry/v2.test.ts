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
    apiVersion: '^3.0.0',
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
          const plugin = createV2Plugin('future-plugin', { apiVersion: '^4.0.0' });

          expect(() => registry.register(plugin)).toThrow(/future CodeGraphy Plugin API/);
          expect(registry.size).toBe(0);
        });



        it('rejects a plugin targeting an unsupported older core API major', () => {
          const { registry } = createConfiguredRegistry();
          const plugin = createV2Plugin('legacy-plugin', { apiVersion: '^2.0.0' });

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
  });
});
