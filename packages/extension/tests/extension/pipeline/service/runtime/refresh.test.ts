import { describe, expect, it, vi } from 'vitest';
import type { IFileAnalysisResult } from '../../../../../src/core/plugins/types/contracts';
import type { IGraphData } from '../../../../../src/shared/graph/contracts';
import { refreshWorkspacePipelineChangedFiles } from '../../../../../src/extension/pipeline/service/runtime/refresh';

function createSource() {
  return {
    _analyzeFiles: vi.fn(),
    _buildGraphData: vi.fn(() => ({ nodes: [], edges: [] })),
    _buildGraphDataFromAnalysis: vi.fn(() => ({ nodes: [{ id: 'node' }], edges: [] })),
    _lastGraphData: {
      nodes: [
        { id: 'src/a.ts', fileSize: 10 },
        { id: 'src/a.ts#run:function', symbol: { filePath: 'src/a.ts' }, fileSize: 10 },
      ],
      edges: [{ from: 'src/a.ts', to: 'src/b.ts', kind: 'import' }],
    },
    _lastDiscoveredDirectories: [] as string[],
    _lastDiscoveredFiles: [] as Array<{ absolutePath: string; relativePath: string }>,
    _lastFileAnalysis: new Map<string, IFileAnalysisResult>(),
    _lastFileConnections: new Map<string, unknown[]>(),
    _lastWorkspaceRoot: '',
    _patchGraphDataNodeMetrics: vi.fn((graphData: IGraphData) => ({
      ...graphData,
      nodes: graphData.nodes.map(node => (
        node.id === 'src/a.ts' || node.symbol?.filePath === 'src/a.ts'
          ? { ...node, fileSize: 12 }
          : node
      )),
    })),
    _readAnalysisFiles: vi.fn(),
    analyze: vi.fn(),
    invalidateWorkspaceFiles: vi.fn(() => []),
  };
}

function createDependencies() {
  return {
    disabledPlugins: new Set<string>(['plugin.disabled']),
    discoveredFiles: [
      { absolutePath: '/workspace/src/a.ts', relativePath: 'src/a.ts' },
      { absolutePath: '/workspace/src/b.ts', relativePath: 'src/b.ts' },
      { absolutePath: '/workspace/src/c.ts', relativePath: 'src/c.ts' },
    ],
    filePaths: ['/workspace/src/a.ts'],
    filterPatterns: ['**/*.ts'],
    notifyFilesChanged: vi.fn(),
    onProgress: vi.fn() as undefined | ((progress: { phase: string; current: number; total: number }) => void),
    persistCache: vi.fn(),
    persistIndexMetadata: vi.fn(async () => undefined),
    signal: new AbortController().signal,
    workspaceRoot: '/workspace',
  };
}

describe('pipeline/service/refresh', () => {
  it('falls back to a full analyze run when plugins request a full refresh', async () => {
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
      additionalFilePaths: [],
      requiresFullRefresh: true,
    });
    source.analyze.mockResolvedValue({ nodes: [{ id: 'full' }], edges: [] });

    const graph = await refreshWorkspacePipelineChangedFiles(source as never, dependencies as never);
    const forwardedProgress = source.analyze.mock.calls[0][3];

    forwardedProgress({ phase: 'Analyzing Files', current: 2, total: 5 });

    expect(source._readAnalysisFiles).toHaveBeenCalledWith([
      { absolutePath: '/workspace/src/a.ts', relativePath: 'src/a.ts' },
    ]);
    expect(source.analyze).toHaveBeenCalledWith(
      ['**/*.ts'],
      dependencies.disabledPlugins,
      dependencies.signal,
      expect.any(Function),
    );
    expect(dependencies.onProgress).toHaveBeenCalledWith({
      phase: 'Analyzing Files',
      current: 2,
      total: 5,
    });
    expect(graph).toEqual({ nodes: [{ id: 'full' }], edges: [] });
  });

  it('falls back to a full analyze run when changed paths are no longer discovered', async () => {
    const source = createSource();
    const dependencies = createDependencies();
    dependencies.filePaths = ['/workspace/missing.ts'];
    dependencies.notifyFilesChanged.mockResolvedValue({
      additionalFilePaths: ['src/missing.ts'],
      requiresFullRefresh: false,
    });
    source._readAnalysisFiles.mockResolvedValue([]);
    source.analyze.mockResolvedValue({ nodes: [{ id: 'full' }], edges: [] });
    source._lastFileAnalysis.set('src/existing.ts', {
      filePath: '/workspace/src/existing.ts',
      relations: [],
    });

    const graph = await refreshWorkspacePipelineChangedFiles(source as never, dependencies as never);

    expect(source.invalidateWorkspaceFiles).toHaveBeenCalledWith(
      ['/workspace/missing.ts'],
      { persist: false },
    );
    expect(source._readAnalysisFiles).not.toHaveBeenCalled();
    expect(dependencies.notifyFilesChanged).not.toHaveBeenCalled();
    expect(source._buildGraphDataFromAnalysis).not.toHaveBeenCalled();
    expect(source.analyze).toHaveBeenCalledWith(
      ['**/*.ts'],
      dependencies.disabledPlugins,
      dependencies.signal,
      expect.any(Function),
    );
    expect(graph).toEqual({ nodes: [{ id: 'full' }], edges: [] });
  });

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
