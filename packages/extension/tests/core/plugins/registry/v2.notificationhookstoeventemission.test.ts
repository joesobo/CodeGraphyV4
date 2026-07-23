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
    ...overrides,
  } as unknown as IPlugin & {
    onLoad: ReturnType<typeof vi.fn>;
    onUnload: ReturnType<typeof vi.fn>;
    onWorkspaceReady: ReturnType<typeof vi.fn>;
    onPreAnalyze: ReturnType<typeof vi.fn>;
    onPostAnalyze: ReturnType<typeof vi.fn>;
    onGraphRebuild: ReturnType<typeof vi.fn>;
  };
}

function createConfiguredRegistry() {
  return { registry: new PluginRegistry() };
}

describe('PluginRegistry notifications', () => {
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

          expect(plugin.onWorkspaceReady).toHaveBeenCalledWith(graph);
          expect(plugin.onPreAnalyze).toHaveBeenCalledWith(
            files,
            '/workspace',
            expect.objectContaining({ fileSystem: expect.any(Object) }),
          );
          expect(plugin.onPostAnalyze).toHaveBeenCalledWith(graph);
          expect(plugin.onGraphRebuild).toHaveBeenCalledWith(graph);
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
          });

          registry.register(plugin);
          expect(() => registry.notifyWorkspaceReady({ nodes: [], edges: [] })).not.toThrow();
          await expect(registry.notifyPreAnalyze([], '/workspace')).resolves.toBeUndefined();
          expect(() => registry.notifyPostAnalyze({ nodes: [], edges: [] })).not.toThrow();
          expect(() => registry.notifyGraphRebuild({ nodes: [], edges: [] })).not.toThrow();
        });
  });

});
