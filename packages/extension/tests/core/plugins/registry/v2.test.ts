import { PluginRegistry } from '@/core/plugins/registry/manager';
import { IPlugin } from '@/core/plugins/types/contracts';
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
    apiVersion: '^4.0.0',
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
  return { registry: new PluginRegistry() };
}

describe('PluginRegistry registration', () => {
  describe('registration contract', () => {

        it('registers without host UI services', () => {
          const registry = new PluginRegistry();
          const plugin = createV2Plugin('no-config');

          expect(() => registry.register(plugin)).not.toThrow();
          expect(registry.size).toBe(1);
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
          const plugin = createV2Plugin('future-plugin', { apiVersion: '^5.0.0' });

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
