import { describe, expect, it, vi } from 'vitest';
import {
  analyzeWorkspacePipelineFiles,
  buildWorkspacePipelineGraphData,
  preAnalyzeWorkspacePipelinePlugins,
  readWorkspacePipelineFileStat,
  readWorkspacePipelineRoot,
} from '../../../src/extension/pipeline/serviceAdapters';

describe('pipeline/serviceAdapters', () => {
  it('pre-analyzes files with shared registry and discovery adapters', async () => {
    const notifyPreAnalyze = vi.fn(async () => undefined);
    const readContent = vi.fn(async () => 'content');

    await preAnalyzeWorkspacePipelinePlugins(
      [{ relativePath: 'src/app.ts', fsPath: '/workspace/src/app.ts' } as never],
      '/workspace',
      { notifyPreAnalyze } as never,
      { readContent } as never,
    );

    expect(notifyPreAnalyze).toHaveBeenCalledOnce();
    expect(readContent).toHaveBeenCalledWith({
      relativePath: 'src/app.ts',
      fsPath: '/workspace/src/app.ts',
    });
  });

  it('analyzes files, builds graphs, and reads workspace io through the extracted helpers', async () => {
    const cache = { files: {} };
    const stat = { mtime: 5, size: 12 };
    const fileSystem = { stat: vi.fn(async () => ({ mtime: 5, size: 12 })) };
    const discovery = {
      readContent: vi.fn(async () => 'content'),
      readAsString: vi.fn(async () => 'content'),
      readAsBytes: vi.fn(async () => new Uint8Array()),
    };
    const registry = {
      analyzeFileResult: vi.fn(async () => ({
        filePath: '/workspace/src/app.ts',
        relations: [
          {
            kind: 'import',
            sourceId: 'test-source',
            specifier: './lib',
            resolvedPath: '/workspace/src/lib.ts',
            fromFilePath: '/workspace/src/app.ts',
            toFilePath: '/workspace/src/lib.ts',
          },
        ],
      })),
    };

    const fileConnections = await analyzeWorkspacePipelineFiles(
      cache as never,
      discovery as never,
      undefined,
      registry as never,
      vi.fn(async () => stat),
      [{ relativePath: 'src/app.ts', fsPath: '/workspace/src/app.ts' } as never],
      '/workspace',
    );

    expect(Array.from(fileConnections.values())[0]).toEqual([
      {
        kind: 'import',
        sourceId: 'test-source',
        specifier: './lib',
        resolvedPath: '/workspace/src/lib.ts',
      },
    ]);

    const graphData = buildWorkspacePipelineGraphData(
      cache as never,
      { workspaceState: { get: vi.fn(() => undefined), update: vi.fn() } } as never,
      {
        getNodeDecorations: vi.fn(() => ({})),
        getAllPlugins: vi.fn(() => []),
        getPluginForFile: vi.fn(() => undefined),
      } as never,
      fileConnections,
      '/workspace',
      true,
    );

    expect(graphData.nodes).toEqual([
      expect.objectContaining({ id: 'src/app.ts', label: 'app.ts' }),
    ]);
    expect(graphData.edges).toEqual([]);

    expect(readWorkspacePipelineRoot([{ uri: { fsPath: '/workspace' } }] as never)).toBe('/workspace');
    await expect(readWorkspacePipelineFileStat('/workspace/src/app.ts', fileSystem as never)).resolves.toEqual(stat);
  });
});
