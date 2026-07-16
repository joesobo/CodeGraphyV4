import { describe, expect, it, vi } from 'vitest';
import {
  createSource,
  createDependencies,
  refreshWorkspacePipelineChangedFiles,
  IFileAnalysisResult,
  IGraphData,
} from './refreshFixture';

describe('pipeline/service/refresh metric-only updates', () => {
  it('patches node metrics without rebuilding the graph when changed-file analysis is graph-equivalent', async () => {
    const source = createSource();
    const dependencies = createDependencies();
    const existingAnalysis: IFileAnalysisResult = {
      filePath: '/workspace/src/a.ts',
      relations: [{
        fromFilePath: '/workspace/src/a.ts',
        kind: 'import',
        resolvedPath: '/workspace/src/b.ts',
        sourceId: 'src/a.ts',
        toFilePath: '/workspace/src/b.ts',
      }],
      symbols: [{
        filePath: '/workspace/src/a.ts',
        id: '/workspace/src/a.ts:function:run',
        kind: 'function',
        name: 'run',
      }],
    };
    source._lastFileAnalysis.set('src/a.ts', existingAnalysis);
    source._lastFileConnections.set('src/a.ts', [{ kind: 'import' }]);
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
      fileAnalysis: new Map([['src/a.ts', { ...existingAnalysis }]]),
      fileConnections: new Map([['src/a.ts', [{ kind: 'import' }]]]),
    });
    const previousGraphData = source._lastGraphData;

    const graph = await refreshWorkspacePipelineChangedFiles(source as never, dependencies as never);

    expect(source._buildGraphDataFromAnalysis).not.toHaveBeenCalled();
    expect(source._buildGraphData).not.toHaveBeenCalled();
    expect(source._patchGraphDataNodeMetrics).toHaveBeenCalledWith(
      previousGraphData,
      ['src/a.ts'],
    );
    expect(source._lastGraphData).toBe(graph);
    expect(graph).toEqual({
      nodes: [
        { id: 'src/a.ts', fileSize: 12 },
        { id: 'src/a.ts#run:function', symbol: { filePath: 'src/a.ts' }, fileSize: 12 },
      ],
      edges: [{ from: 'src/a.ts', to: 'src/b.ts', kind: 'import' }],
    });
    expect(dependencies.persistCache).toHaveBeenCalledOnce();
    expect(dependencies.persistIndexMetadata).toHaveBeenCalledOnce();
  });

  it('can return metric-only graph patches before index metadata persistence settles', async () => {
    const source = createSource();
    const dependencies = createDependencies();
    const existingAnalysis: IFileAnalysisResult = {
      filePath: '/workspace/src/a.ts',
      relations: [{
        fromFilePath: '/workspace/src/a.ts',
        kind: 'import',
        resolvedPath: '/workspace/src/b.ts',
        sourceId: 'src/a.ts',
        toFilePath: '/workspace/src/b.ts',
      }],
      symbols: [{
        filePath: '/workspace/src/a.ts',
        id: '/workspace/src/a.ts:function:run',
        kind: 'function',
        name: 'run',
      }],
    };
    source._lastFileAnalysis.set('src/a.ts', existingAnalysis);
    source._lastFileConnections.set('src/a.ts', [{ kind: 'import' }]);
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
      fileAnalysis: new Map([['src/a.ts', { ...existingAnalysis }]]),
      fileConnections: new Map([['src/a.ts', [{ kind: 'import' }]]]),
    });
    let resolvePersistIndexMetadata: (() => void) | undefined;
    dependencies.persistIndexMetadata = vi.fn(() => new Promise<void>(resolve => {
      resolvePersistIndexMetadata = resolve;
    }));
    (dependencies as typeof dependencies & { deferMetricOnlyIndexMetadata: boolean })
      .deferMetricOnlyIndexMetadata = true;

    const graphPromise = refreshWorkspacePipelineChangedFiles(source as never, dependencies as never);
    const result = await Promise.race([
      graphPromise.then(graph => ({ status: 'resolved' as const, graph })),
      new Promise<{ status: 'pending' }>(resolve => {
        setTimeout(() => resolve({ status: 'pending' }), 0);
      }),
    ]);

    expect(result.status).toBe('resolved');
    expect(dependencies.persistIndexMetadata).toHaveBeenCalledOnce();
    resolvePersistIndexMetadata?.();
    expect(await graphPromise).toEqual((result as { graph: IGraphData }).graph);
  });

  it('reports deferred metric-only index metadata persistence failures', async () => {
    const source = createSource();
    const dependencies = createDependencies();
    const existingAnalysis: IFileAnalysisResult = {
      filePath: '/workspace/src/a.ts',
      relations: [{
        fromFilePath: '/workspace/src/a.ts',
        kind: 'import',
        resolvedPath: '/workspace/src/b.ts',
        sourceId: 'src/a.ts',
        toFilePath: '/workspace/src/b.ts',
      }],
      symbols: [{
        filePath: '/workspace/src/a.ts',
        id: '/workspace/src/a.ts:function:run',
        kind: 'function',
        name: 'run',
      }],
    };
    source._lastFileAnalysis.set('src/a.ts', existingAnalysis);
    source._lastFileConnections.set('src/a.ts', [{ kind: 'import' }]);
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
      fileAnalysis: new Map([['src/a.ts', { ...existingAnalysis }]]),
      fileConnections: new Map([['src/a.ts', [{ kind: 'import' }]]]),
    });
    const persistenceError = new Error('persist failed');
    const onDeferredIndexMetadataError = vi.fn();
    dependencies.persistIndexMetadata = vi.fn(async () => {
      throw persistenceError;
    });
    (dependencies as typeof dependencies & {
      deferMetricOnlyIndexMetadata: boolean;
      onDeferredIndexMetadataError: (error: unknown) => void;
    }).deferMetricOnlyIndexMetadata = true;
    (dependencies as typeof dependencies & {
      onDeferredIndexMetadataError: (error: unknown) => void;
    }).onDeferredIndexMetadataError = onDeferredIndexMetadataError;

    await refreshWorkspacePipelineChangedFiles(source as never, dependencies as never);
    await Promise.resolve();

    expect(onDeferredIndexMetadataError).toHaveBeenCalledWith(persistenceError);
  });
});
