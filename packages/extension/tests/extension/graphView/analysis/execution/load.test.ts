import { describe, expect, it, vi } from 'vitest';
import { loadGraphViewRawData } from '../../../../../src/extension/graphView/analysis/execution/load';
import type { IGraphData } from '../../../../../src/shared/graph/contracts';
import {
  createExecutionAnalyzer,
  createExecutionHandlers,
  createExecutionState,
} from './fixtures';

describe('graph view analysis execution load', () => {
  it('discovers a disconnected graph when loading without an existing index', async () => {
    const discoveredGraph = {
      nodes: [{ id: 'src/index.ts', label: 'src/index.ts', color: '#ffffff' }],
      edges: [],
    };
    const discoverGraph = vi.fn(async () => ({
      ...discoveredGraph,
    }));
    const analyze = vi.fn(async () => ({ nodes: [], edges: [] }));
    const state = createExecutionState({
      mode: 'load',
      analyzer: createExecutionAnalyzer({
        hasIndex: vi.fn(() => false),
        discoverGraph,
        analyze,
      }),
      analyzerInitialized: true,
    });
    const { handlers } = createExecutionHandlers();

    const result = await loadGraphViewRawData(new AbortController().signal, state, handlers);

    expect(result.shouldDiscover).toBe(true);
    expect(result.rawGraphData).toEqual(discoveredGraph);
    expect(discoverGraph).toHaveBeenCalledOnce();
    expect(analyze).not.toHaveBeenCalled();
    expect(handlers.sendIndexProgress).not.toHaveBeenCalled();
  });

  it('analyzes the workspace when loading from an existing index', async () => {
    const analyzedGraph = {
      nodes: [{ id: 'src/app.ts', label: 'src/app.ts', color: '#ffffff' }],
      edges: [],
    };
    const analyze = vi.fn(async () => analyzedGraph);
    const state = createExecutionState({
      mode: 'load',
      analyzer: createExecutionAnalyzer({
        hasIndex: vi.fn(() => true),
        analyze,
      }),
      analyzerInitialized: true,
    });
    const { handlers } = createExecutionHandlers();

    const result = await loadGraphViewRawData(new AbortController().signal, state, handlers);

    expect(result.shouldDiscover).toBe(false);
    expect(result.rawGraphData).toEqual(analyzedGraph);
    expect(analyze).toHaveBeenCalledOnce();
  });

  it('loads cached graph data instead of reanalyzing when a fresh index can be replayed', async () => {
    const cachedGraph: IGraphData = {
      nodes: [{ id: 'src/cached.ts', label: 'src/cached.ts', color: '#ffffff' }],
      edges: [],
    };
    const loadCachedGraph = vi.fn(async () => cachedGraph);
    const analyze = vi.fn(async () => ({
      nodes: [{ id: 'src/analyzed.ts', label: 'src/analyzed.ts', color: '#ffffff' }],
      edges: [],
    }));
    const refreshIndex = vi.fn(async () => ({ nodes: [], edges: [] }));
    const state = createExecutionState({
      mode: 'load',
      analyzer: createExecutionAnalyzer({
        hasIndex: vi.fn(() => true),
        getIndexStatus: vi.fn(() => ({
          freshness: 'fresh' as const,
          detail: 'CodeGraphy Workspace Graph Cache is fresh.',
        })),
        loadCachedGraph,
        analyze,
        refreshIndex,
      }),
      analyzerInitialized: true,
    });
    const { handlers } = createExecutionHandlers();

    const result = await loadGraphViewRawData(
      new AbortController().signal,
      state,
      handlers,
    );

    expect(result.shouldDiscover).toBe(false);
    expect(result.rawGraphData).toEqual(cachedGraph);
    expect(loadCachedGraph).toHaveBeenCalledWith(
      [],
      new Set<string>(),
      expect.any(AbortSignal),
      { includeCurrentGitignoreMetadata: true },
    );
    expect(analyze).not.toHaveBeenCalled();
    expect(refreshIndex).not.toHaveBeenCalled();
    expect(handlers.emitDiagnostic).toHaveBeenCalledWith({
      area: 'extension.analysis',
      event: 'load-decision',
      context: {
        mode: 'load',
        route: 'cached',
        shouldDiscover: false,
        indexFreshness: 'fresh',
        canReplayCache: true,
      },
    });
  });

  it('loads cached graph data instead of blocking on refresh when a stale index can be replayed', async () => {
    const cachedGraph: IGraphData = {
      nodes: [{ id: 'src/cached.ts', label: 'src/cached.ts', color: '#ffffff' }],
      edges: [],
    };
    const loadCachedGraph = vi.fn(async () => cachedGraph);
    const refreshIndex = vi.fn(async () => ({
      nodes: [{ id: 'src/reindexed.ts', label: 'src/reindexed.ts', color: '#ffffff' }],
      edges: [],
    }));
    const analyze = vi.fn(async () => ({ nodes: [], edges: [] }));
    const state = createExecutionState({
      mode: 'load',
      analyzer: createExecutionAnalyzer({
        hasIndex: vi.fn(() => true),
        getIndexStatus: vi.fn(() => ({
          freshness: 'stale' as const,
          detail: 'CodeGraphy Workspace Graph Cache is stale: enabled plugins changed.',
        })),
        loadCachedGraph,
        analyze,
        refreshIndex,
      }),
      analyzerInitialized: true,
    });

    const result = await loadGraphViewRawData(
      new AbortController().signal,
      state,
      createExecutionHandlers().handlers,
    );

    expect(result.shouldDiscover).toBe(false);
    expect(result.rawGraphData).toEqual(cachedGraph);
    expect(loadCachedGraph).toHaveBeenCalledWith(
      [],
      new Set<string>(),
      expect.any(AbortSignal),
      { includeCurrentGitignoreMetadata: false },
    );
    expect(refreshIndex).not.toHaveBeenCalled();
    expect(analyze).not.toHaveBeenCalled();
  });

  it('falls back to full refresh when stale cache cannot be replayed', async () => {
    const refreshedGraph: IGraphData = {
      nodes: [{ id: 'src/app.ts', label: 'src/app.ts', color: '#ffffff' }],
      edges: [
        {
          id: 'src/app.ts->src/plugin.ts#import',
          from: 'src/app.ts',
          to: 'src/plugin.ts',
          kind: 'import',
          sources: [],
        },
      ],
    };
    const analyze = vi.fn(async () => ({ nodes: [], edges: [] }));
    const refreshIndex = vi.fn(async () => refreshedGraph);
    const state = createExecutionState({
      mode: 'load',
      analyzer: createExecutionAnalyzer({
        hasIndex: vi.fn(() => true),
        getIndexStatus: vi.fn(() => ({
          freshness: 'stale' as const,
          detail: 'CodeGraphy Workspace Graph Cache is stale: enabled plugins changed.',
        })),
        analyze,
        refreshIndex,
      }),
      analyzerInitialized: true,
    });
    const { handlers } = createExecutionHandlers();

    const result = await loadGraphViewRawData(new AbortController().signal, state, handlers);

    expect(result.shouldDiscover).toBe(false);
    expect(result.rawGraphData).toEqual(refreshedGraph);
    expect(refreshIndex).toHaveBeenCalledOnce();
    expect(analyze).not.toHaveBeenCalled();
  });

  it('runs index mode through the refresh index path', async () => {
    const indexedGraph = {
      nodes: [{ id: 'src/indexed.ts', label: 'src/indexed.ts', color: '#ffffff' }],
      edges: [],
    };
    const analyze = vi.fn(async () => ({ nodes: [], edges: [] }));
    const refreshIndex = vi.fn(async () => indexedGraph);
    const state = createExecutionState({
      mode: 'index',
      analyzer: createExecutionAnalyzer({
        analyze,
        refreshIndex,
      }),
      analyzerInitialized: true,
    });
    const { handlers } = createExecutionHandlers();

    const result = await loadGraphViewRawData(new AbortController().signal, state, handlers);

    expect(result.rawGraphData).toEqual(indexedGraph);
    expect(refreshIndex).toHaveBeenCalledOnce();
    expect(analyze).not.toHaveBeenCalled();
  });

  it('syncs stale cache in analyze mode without forcing a full index refresh', async () => {
    const analyzedGraph = {
      nodes: [{ id: 'src/synced.ts', label: 'src/synced.ts', color: '#ffffff' }],
      edges: [],
    };
    const analyze = vi.fn(async () => analyzedGraph);
    const refreshIndex = vi.fn(async () => ({
      nodes: [{ id: 'src/reindexed.ts', label: 'src/reindexed.ts', color: '#ffffff' }],
      edges: [],
    }));
    const state = createExecutionState({
      mode: 'analyze',
      analyzer: createExecutionAnalyzer({
        getIndexStatus: vi.fn(() => ({
          freshness: 'stale' as const,
          detail: 'CodeGraphy Workspace Graph Cache is stale: Workspace Settings changed.',
        })),
        analyze,
        refreshIndex,
      }),
      analyzerInitialized: true,
    });

    const result = await loadGraphViewRawData(
      new AbortController().signal,
      state,
      createExecutionHandlers().handlers,
    );

    expect(result.rawGraphData).toEqual(analyzedGraph);
    expect(analyze).toHaveBeenCalledOnce();
    expect(refreshIndex).not.toHaveBeenCalled();
  });

  it('runs explicit full refresh through the analyzer refresh path', async () => {
    const refreshedGraph = {
      nodes: [{ id: 'src/refresh.ts', label: 'src/refresh.ts', color: '#ffffff' }],
      edges: [],
    };
    const state = createExecutionState({
      mode: 'refresh',
      analyzer: createExecutionAnalyzer({
        refreshIndex: vi.fn(async (_patterns, _disabledPlugins, _signal, onProgress) => {
          onProgress?.({ phase: 'Refreshing Index', current: 1, total: 3 });
          return refreshedGraph;
        }),
      }),
      analyzerInitialized: true,
    });
    const { handlers } = createExecutionHandlers();

    const result = await loadGraphViewRawData(new AbortController().signal, state, handlers);

    expect(result).toEqual({
      rawGraphData: refreshedGraph,
      shouldDiscover: false,
    });
    expect(handlers.sendIndexProgress).toHaveBeenCalledWith({
      phase: 'Refreshing Index',
      current: 0,
      total: 1,
    });
    expect(handlers.sendIndexProgress).toHaveBeenCalledWith({
      phase: 'Refreshing Index',
      current: 1,
      total: 3,
    });
  });

  it('returns an empty graph immediately when no analyzer is available', async () => {
    const state = createExecutionState({
      mode: 'analyze',
      analyzer: undefined,
    });
    const { handlers } = createExecutionHandlers();

    await expect(
      loadGraphViewRawData(new AbortController().signal, state, handlers),
    ).resolves.toEqual({
      rawGraphData: { nodes: [], edges: [] },
      shouldDiscover: false,
    });

    expect(handlers.sendIndexProgress).not.toHaveBeenCalled();
  });

  it('returns an empty graph without discovery when loading with no analyzer', async () => {
    const state = createExecutionState({
      mode: 'load',
      analyzer: undefined,
    });
    const { handlers } = createExecutionHandlers();

    await expect(
      loadGraphViewRawData(new AbortController().signal, state, handlers),
    ).resolves.toEqual({
      rawGraphData: { nodes: [], edges: [] },
      shouldDiscover: false,
    });
  });

  it('falls back to the empty graph when load discovery support is unavailable', async () => {
    const state = createExecutionState({
      mode: 'load',
      analyzer: createExecutionAnalyzer({
        hasIndex: vi.fn(() => false),
        discoverGraph: undefined,
      }),
      analyzerInitialized: true,
    });
    const { handlers } = createExecutionHandlers();

    await expect(
      loadGraphViewRawData(new AbortController().signal, state, handlers),
    ).resolves.toEqual({
      rawGraphData: { nodes: [], edges: [] },
      shouldDiscover: true,
    });

    expect(handlers.sendIndexProgress).not.toHaveBeenCalled();
  });

  it('runs incremental refreshes through changed-file analysis when available', async () => {
    const incrementalGraph = {
      nodes: [{ id: 'src/changed.ts', label: 'src/changed.ts', color: '#ffffff' }],
      edges: [],
    };
    const refreshChangedFiles = vi.fn(async (changedPaths, _patterns, _disabledPlugins, _signal, onProgress) => {
      onProgress?.({ phase: 'Applying Changes', current: 2, total: 4 });
      return changedPaths.length > 0 ? incrementalGraph : { nodes: [], edges: [] };
    });
    const analyze = vi.fn(async () => ({ nodes: [], edges: [] }));
    const state = createExecutionState({
      mode: 'incremental',
      changedFilePaths: ['src/changed.ts'],
      analyzer: createExecutionAnalyzer({
        refreshChangedFiles,
        analyze,
      }),
      analyzerInitialized: true,
    });
    const { handlers } = createExecutionHandlers();

    const result = await loadGraphViewRawData(new AbortController().signal, state, handlers);

    expect(result).toEqual({
      rawGraphData: incrementalGraph,
      shouldDiscover: false,
    });
    expect(refreshChangedFiles).toHaveBeenCalledWith(
      ['src/changed.ts'],
      [],
      new Set<string>(),
      expect.any(AbortSignal),
      expect.any(Function),
    );
    expect(analyze).not.toHaveBeenCalled();
    expect(handlers.sendIndexProgress).toHaveBeenCalledWith({
      phase: 'Applying Changes',
      current: 0,
      total: 1,
    });
    expect(handlers.sendIndexProgress).toHaveBeenCalledWith({
      phase: 'Applying Changes',
      current: 2,
      total: 4,
    });
  });

  it('routes incremental refreshes without reading index freshness', async () => {
    const incrementalGraph = {
      nodes: [{ id: 'src/changed.ts', label: 'src/changed.ts', color: '#ffffff' }],
      edges: [],
    };
    const getIndexStatus = vi.fn(() => {
      throw new Error('incremental refresh should not read index freshness');
    });
    const refreshChangedFiles = vi.fn(async () => incrementalGraph);
    const state = createExecutionState({
      mode: 'incremental',
      changedFilePaths: ['src/changed.ts'],
      analyzer: createExecutionAnalyzer({
        getIndexStatus,
        refreshChangedFiles,
      }),
      analyzerInitialized: true,
    });

    const result = await loadGraphViewRawData(
      new AbortController().signal,
      state,
      createExecutionHandlers().handlers,
    );

    expect(result).toEqual({
      rawGraphData: incrementalGraph,
      shouldDiscover: false,
    });
    expect(getIndexStatus).not.toHaveBeenCalled();
    expect(refreshChangedFiles).toHaveBeenCalledOnce();
  });

  it('falls back to full analysis for incremental mode when changed-file refresh is unavailable', async () => {
    const analyzedGraph = {
      nodes: [{ id: 'src/fallback.ts', label: 'src/fallback.ts', color: '#ffffff' }],
      edges: [],
    };
    const analyze = vi.fn(async () => analyzedGraph);
    const state = createExecutionState({
      mode: 'incremental',
      analyzer: createExecutionAnalyzer({
        refreshChangedFiles: undefined,
        analyze,
      }),
      analyzerInitialized: true,
    });
    const { handlers } = createExecutionHandlers();

    const result = await loadGraphViewRawData(new AbortController().signal, state, handlers);

    expect(result).toEqual({
      rawGraphData: analyzedGraph,
      shouldDiscover: false,
    });
    expect(analyze).toHaveBeenCalledOnce();
    expect(handlers.sendIndexProgress).toHaveBeenCalledWith({
      phase: 'Applying Changes',
      current: 0,
      total: 1,
    });
  });

  it('falls back to the empty graph when analyze mode does not provide an analyze hook', async () => {
    const state = createExecutionState({
      mode: 'analyze',
      analyzer: createExecutionAnalyzer({
        analyze: undefined,
      }),
      analyzerInitialized: true,
    });
    const { handlers } = createExecutionHandlers();

    await expect(
      loadGraphViewRawData(new AbortController().signal, state, handlers),
    ).resolves.toEqual({
      rawGraphData: { nodes: [], edges: [] },
      shouldDiscover: false,
    });
  });

  it('does not switch analyze mode into discovery even when the analyzer has no index', async () => {
    const analyzedGraph = {
      nodes: [{ id: 'src/analyze.ts', label: 'src/analyze.ts', color: '#ffffff' }],
      edges: [],
    };
    const discoverGraph = vi.fn(async () => ({ nodes: [], edges: [] }));
    const analyze = vi.fn(async () => analyzedGraph);
    const state = createExecutionState({
      mode: 'analyze',
      analyzer: createExecutionAnalyzer({
        hasIndex: vi.fn(() => false),
        discoverGraph,
        analyze,
      }),
      analyzerInitialized: true,
    });

    await expect(
      loadGraphViewRawData(new AbortController().signal, state, createExecutionHandlers().handlers),
    ).resolves.toEqual({
      rawGraphData: analyzedGraph,
      shouldDiscover: false,
    });

    expect(discoverGraph).not.toHaveBeenCalled();
    expect(analyze).toHaveBeenCalledOnce();
  });
});
