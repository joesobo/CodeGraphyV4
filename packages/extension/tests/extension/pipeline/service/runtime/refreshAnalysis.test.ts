import { describe, expect, it } from 'vitest';
import {
  createSource,
  createDependencies,
  refreshWorkspacePipelineChangedFiles,
} from './refreshFixture';

describe('pipeline/service/refresh analysis', () => {
  it('reanalyzes changed files and plugin-requested dependents, then persists the refreshed state', async () => {
    const source = createSource();
    const dependencies = createDependencies();
    source._readAnalysisFiles.mockResolvedValue([
      {
        absolutePath: '/workspace/src/a.ts',
        relativePath: 'src/a.ts',
        content: 'content:a',
      },
    ]);
    dependencies.notifyFilesChanged.mockResolvedValue({
      additionalFilePaths: ['src/b.ts'],
      requiresFullRefresh: false,
    });
    source._analyzeFiles.mockImplementation(async (_files, _root, onProgress) => {
      onProgress?.({ current: 1, total: 2, filePath: '/workspace/src/b.ts' });
      return {
        cacheHits: 0,
        cacheMisses: 2,
        fileAnalysis: new Map([
          ['src/a.ts', { filePath: '/workspace/src/a.ts', relations: [] }],
          ['src/b.ts', { filePath: '/workspace/src/b.ts', relations: [] }],
        ]),
        fileConnections: new Map([
          ['src/a.ts', [{ kind: 'import' }]],
          ['src/b.ts', [{ kind: 'call' }]],
        ]),
      };
    });

    const graph = await refreshWorkspacePipelineChangedFiles(source as never, dependencies as never);

    expect(source._lastDiscoveredFiles).toEqual(dependencies.discoveredFiles);
    expect(source._lastWorkspaceRoot).toBe('/workspace');
    expect(source.invalidateWorkspaceFiles).toHaveBeenCalledWith([
      '/workspace/src/a.ts',
      '/workspace/src/b.ts',
    ], { persist: false });
    expect(dependencies.onProgress).toHaveBeenNthCalledWith(1, {
      phase: 'Applying Changes',
      current: 0,
      total: 2,
    });
    expect(dependencies.onProgress).toHaveBeenNthCalledWith(2, {
      phase: 'Applying Changes',
      current: 1,
      total: 2,
    });
    expect(source._lastFileAnalysis.get('src/a.ts')).toEqual({
      filePath: '/workspace/src/a.ts',
      relations: [],
    });
    expect(source._lastFileConnections.get('src/b.ts')).toEqual([{ kind: 'call' }]);
    expect(dependencies.persistCache).toHaveBeenCalledOnce();
    expect(dependencies.persistIndexMetadata).toHaveBeenCalledOnce();
    expect(source._buildGraphDataFromAnalysis).toHaveBeenCalledWith(
      source._lastFileAnalysis,
      '/workspace',
      dependencies.disabledPlugins,
    );
    expect(source._buildGraphData).toHaveBeenCalledWith(
      source._lastFileConnections,
      '/workspace',
      dependencies.disabledPlugins,
    );
    expect(graph).toEqual({ nodes: [{ id: 'node' }], edges: [] });
  });

  it('supports refreshes without a progress callback', async () => {
    const source = createSource();
    const dependencies = createDependencies();
    dependencies.onProgress = undefined;
    source._readAnalysisFiles.mockResolvedValue([
      {
        absolutePath: '/workspace/src/a.ts',
        relativePath: 'src/a.ts',
        content: 'content:a',
      },
    ]);
    dependencies.notifyFilesChanged.mockResolvedValue({
      additionalFilePaths: [],
      requiresFullRefresh: false,
    });
    source._analyzeFiles.mockResolvedValue({
      cacheHits: 0,
      cacheMisses: 1,
      fileAnalysis: new Map([
        ['src/a.ts', { filePath: '/workspace/src/a.ts', relations: [] }],
      ]),
      fileConnections: new Map([
        ['src/a.ts', []],
      ]),
    });

    await expect(
      refreshWorkspacePipelineChangedFiles(source as never, dependencies as never),
    ).resolves.toEqual({ nodes: [{ id: 'node' }], edges: [] });
  });
});
