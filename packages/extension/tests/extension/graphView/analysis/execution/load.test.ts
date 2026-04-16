import { describe, expect, it, vi } from 'vitest';
import { loadGraphViewRawData } from '../../../../../src/extension/graphView/analysis/execution/load';
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
