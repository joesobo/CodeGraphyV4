import { describe, expect, it, vi } from 'vitest';
import { loadGraphViewRawData } from '../../../../../src/extension/graphView/analysis/execution/load';
import {
  createExecutionAnalyzer,
  createExecutionHandlers,
  createExecutionState,
} from './fixtures';

describe('graph view analysis execution load', () => {
  it('returns an empty graph for a missing cache without analyzing source', async () => {
    const analyze = vi.fn(async () => ({ nodes: [], edges: [] }));
    const state = createExecutionState({
      mode: 'load',
      analyzer: createExecutionAnalyzer({
        hasIndex: vi.fn(() => false),
        analyze,
        loadCachedGraph: vi.fn(async () => ({ nodes: [], edges: [] })),
      }),
    });
    const { handlers } = createExecutionHandlers();

    await expect(
      loadGraphViewRawData(new AbortController().signal, state, handlers),
    ).resolves.toEqual({ nodes: [], edges: [] });

    expect(analyze).not.toHaveBeenCalled();
    expect(handlers.emitDiagnostic).toHaveBeenCalledWith({
      area: 'extension.analysis',
      event: 'load-decision',
      context: {
        mode: 'load',
        route: 'empty',
        indexFreshness: 'missing',
        canReplayCache: true,
      },
    });
  });

  it('replays a fresh cached graph', async () => {
    const cachedGraph = {
      nodes: [{ id: 'src/app.ts', label: 'app.ts', color: '#ffffff' }],
      edges: [],
    };
    const loadCachedGraph = vi.fn(async () => cachedGraph);
    const state = createExecutionState({
      mode: 'load',
      analyzer: createExecutionAnalyzer({
        loadCachedGraph,
        getIndexStatus: vi.fn(() => ({
          freshness: 'fresh' as const,
          detail: 'fresh',
        })),
      }),
    });
    const { handlers } = createExecutionHandlers();

    await expect(
      loadGraphViewRawData(new AbortController().signal, state, handlers),
    ).resolves.toEqual(cachedGraph);

    expect(loadCachedGraph).toHaveBeenCalledOnce();
  });

  it('replays a stale cached graph without refreshing it', async () => {
    const cachedGraph = {
      nodes: [{ id: 'src/stale.ts', label: 'stale.ts', color: '#ffffff' }],
      edges: [],
    };
    const refreshIndex = vi.fn(async () => ({ nodes: [], edges: [] }));
    const state = createExecutionState({
      mode: 'load',
      analyzer: createExecutionAnalyzer({
        loadCachedGraph: vi.fn(async () => cachedGraph),
        refreshIndex,
        getIndexStatus: vi.fn(() => ({
          freshness: 'stale' as const,
          detail: 'stale',
        })),
      }),
    });
    const { handlers } = createExecutionHandlers();

    await expect(
      loadGraphViewRawData(new AbortController().signal, state, handlers),
    ).resolves.toEqual(cachedGraph);

    expect(refreshIndex).not.toHaveBeenCalled();
  });

  it.each(['index', 'refresh'] as const)('%s performs an explicit index refresh', async mode => {
    const graph = {
      nodes: [{ id: 'src/indexed.ts', label: 'indexed.ts', color: '#ffffff' }],
      edges: [],
    };
    const refreshIndex = vi.fn(async () => graph);
    const state = createExecutionState({
      mode,
      analyzer: createExecutionAnalyzer({ refreshIndex }),
    });
    const { handlers } = createExecutionHandlers();

    await expect(
      loadGraphViewRawData(new AbortController().signal, state, handlers),
    ).resolves.toEqual(graph);

    expect(refreshIndex).toHaveBeenCalledOnce();
  });

  it('returns an empty graph when no analyzer is available', async () => {
    const state = createExecutionState({ mode: 'load', analyzer: undefined });
    const { handlers } = createExecutionHandlers();

    await expect(
      loadGraphViewRawData(new AbortController().signal, state, handlers),
    ).resolves.toEqual({ nodes: [], edges: [] });
  });
});
