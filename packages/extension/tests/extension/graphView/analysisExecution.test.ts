import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../src/shared/types';
import {
  executeGraphViewAnalysis,
  type GraphViewAnalysisExecutionHandlers,
  type GraphViewAnalysisExecutionState,
} from '../../../src/extension/graphView/analysisExecution';

function createState(
  overrides: Partial<GraphViewAnalysisExecutionState> = {},
): GraphViewAnalysisExecutionState {
  return {
    analyzer: undefined,
    analyzerInitialized: false,
    analyzerInitPromise: undefined,
    filterPatterns: [],
    disabledRules: new Set<string>(),
    disabledPlugins: new Set<string>(),
    ...overrides,
  };
}

function createHandlers(
  overrides: Partial<GraphViewAnalysisExecutionHandlers> = {},
) {
  let graphData: IGraphData = { nodes: [], edges: [] };

  const handlers: GraphViewAnalysisExecutionHandlers = {
    isAnalysisStale: vi.fn(() => false),
    hasWorkspace: vi.fn(() => true),
    setRawGraphData: vi.fn(),
    setGraphData: vi.fn((nextGraphData: IGraphData) => {
      graphData = nextGraphData;
    }),
    getGraphData: vi.fn(() => graphData),
    sendGraphDataUpdated: vi.fn(),
    sendAvailableViews: vi.fn(),
    computeMergedGroups: vi.fn(),
    sendGroupsUpdated: vi.fn(),
    updateViewContext: vi.fn(),
    applyViewTransform: vi.fn(),
    sendPluginStatuses: vi.fn(),
    sendDecorations: vi.fn(),
    sendContextMenuItems: vi.fn(),
    notifyPostAnalyze: vi.fn(),
    markWorkspaceReady: vi.fn(),
    isAbortError: vi.fn(() => false),
    logError: vi.fn(),
    ...overrides,
  };

  return { handlers, getGraphData: () => graphData };
}

describe('graph view analysis execution', () => {
  it('returns before doing any work when the request is already stale', async () => {
    const state = createState();
    const { handlers } = createHandlers({
      isAnalysisStale: vi.fn(() => true),
    });

    await executeGraphViewAnalysis(new AbortController().signal, 1, state, handlers);

    expect(handlers.computeMergedGroups).not.toHaveBeenCalled();
    expect(handlers.setRawGraphData).not.toHaveBeenCalled();
    expect(handlers.sendAvailableViews).not.toHaveBeenCalled();
  });

  it('publishes an empty graph when no analyzer exists', async () => {
    const state = createState();
    const { handlers } = createHandlers();

    await executeGraphViewAnalysis(new AbortController().signal, 1, state, handlers);

    expect(handlers.setRawGraphData).toHaveBeenCalledWith({ nodes: [], edges: [] });
    expect(handlers.setGraphData).toHaveBeenCalledWith({ nodes: [], edges: [] });
    expect(handlers.sendGraphDataUpdated).toHaveBeenCalledWith({ nodes: [], edges: [] });
    expect(handlers.sendAvailableViews).toHaveBeenCalledOnce();
  });

  it('initializes the analyzer once and stops when the request turns stale after initialization', async () => {
    const initialize = vi.fn(async () => undefined);
    const state = createState({
      analyzer: {
        initialize,
        analyze: vi.fn(async () => ({ nodes: [], edges: [] })),
        registry: {
          notifyPostAnalyze: vi.fn(),
        },
      },
    });
    const { handlers } = createHandlers({
      isAnalysisStale: vi.fn()
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true),
    });

    await executeGraphViewAnalysis(new AbortController().signal, 1, state, handlers);

    expect(initialize).toHaveBeenCalledOnce();
    expect(state.analyzerInitialized).toBe(true);
    expect(state.analyzerInitPromise).toBeUndefined();
    expect(handlers.computeMergedGroups).not.toHaveBeenCalled();
  });

  it('reuses an in-flight analyzer initialization promise', async () => {
    const initialize = vi.fn(async () => undefined);
    const analyzerInitPromise = Promise.resolve().then(() => undefined);
    const state = createState({
      analyzer: {
        initialize,
        analyze: vi.fn(async () => ({ nodes: [], edges: [] })),
        registry: {
          notifyPostAnalyze: vi.fn(),
        },
      },
      analyzerInitPromise,
    });
    const { handlers } = createHandlers({
      hasWorkspace: vi.fn(() => false),
    });

    await executeGraphViewAnalysis(new AbortController().signal, 1, state, handlers);

    expect(initialize).not.toHaveBeenCalled();
    expect(state.analyzerInitialized).toBe(false);
    expect(state.analyzerInitPromise).toBe(analyzerInitPromise);
    expect(handlers.computeMergedGroups).toHaveBeenCalledOnce();
  });

  it('publishes an empty graph after group recompute when no workspace is available', async () => {
    const analyze = vi.fn(async () => ({ nodes: [{ id: 'src/index.ts' }], edges: [] }));
    const state = createState({
      analyzer: {
        initialize: vi.fn(async () => undefined),
        analyze,
        registry: {
          notifyPostAnalyze: vi.fn(),
        },
      },
      analyzerInitialized: true,
    });
    const { handlers } = createHandlers({
      hasWorkspace: vi.fn(() => false),
    });

    await executeGraphViewAnalysis(new AbortController().signal, 1, state, handlers);

    expect(handlers.computeMergedGroups).toHaveBeenCalledOnce();
    expect(handlers.sendGroupsUpdated).toHaveBeenCalledOnce();
    expect(analyze).not.toHaveBeenCalled();
    expect(handlers.setRawGraphData).toHaveBeenCalledWith({ nodes: [], edges: [] });
    expect(handlers.setGraphData).toHaveBeenCalledWith({ nodes: [], edges: [] });
    expect(handlers.sendGraphDataUpdated).toHaveBeenCalledWith({ nodes: [], edges: [] });
  });

  it('analyzes the workspace and publishes the transformed graph', async () => {
    const rawGraphData: IGraphData = { nodes: [{ id: 'src/index.ts' }], edges: [] };
    const transformedGraphData: IGraphData = {
      nodes: [{ id: 'src/index.ts', label: 'src/index.ts' }],
      edges: [],
    };
    const state = createState({
      analyzer: {
        analyze: vi.fn(() => Promise.resolve(rawGraphData)),
        registry: {
          notifyPostAnalyze: vi.fn(),
        },
      },
      analyzerInitialized: true,
    });
    const { handlers, getGraphData } = createHandlers({
      applyViewTransform: vi.fn(() => {
        handlers.setGraphData(transformedGraphData);
      }),
    });

    await executeGraphViewAnalysis(new AbortController().signal, 1, state, handlers);

    expect(state.analyzer?.analyze).toHaveBeenCalledOnce();
    expect(handlers.computeMergedGroups).toHaveBeenCalledOnce();
    expect(handlers.sendGroupsUpdated).toHaveBeenCalledOnce();
    expect(handlers.updateViewContext).toHaveBeenCalledOnce();
    expect(handlers.applyViewTransform).toHaveBeenCalledOnce();
    expect(handlers.sendGraphDataUpdated).toHaveBeenCalledWith(transformedGraphData);
    expect(handlers.sendPluginStatuses).toHaveBeenCalledOnce();
    expect(handlers.sendDecorations).toHaveBeenCalledOnce();
    expect(handlers.sendContextMenuItems).toHaveBeenCalledOnce();
    expect(state.analyzer?.registry.notifyPostAnalyze).toHaveBeenCalledWith(getGraphData());
    expect(handlers.markWorkspaceReady).toHaveBeenCalledWith(getGraphData());
  });

  it('drops analyzed graph results when the request turns stale after analyze resolves', async () => {
    const rawGraphData: IGraphData = { nodes: [{ id: 'src/index.ts' }], edges: [] };
    const state = createState({
      analyzer: {
        initialize: vi.fn(async () => undefined),
        analyze: vi.fn(async () => rawGraphData),
        registry: {
          notifyPostAnalyze: vi.fn(),
        },
      },
      analyzerInitialized: true,
    });
    const { handlers } = createHandlers({
      isAnalysisStale: vi.fn()
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true),
    });

    await executeGraphViewAnalysis(new AbortController().signal, 1, state, handlers);

    expect(state.analyzer?.analyze).toHaveBeenCalledOnce();
    expect(handlers.setRawGraphData).not.toHaveBeenCalled();
    expect(handlers.sendGraphDataUpdated).not.toHaveBeenCalled();
    expect(state.analyzer?.registry.notifyPostAnalyze).not.toHaveBeenCalled();
    expect(handlers.markWorkspaceReady).not.toHaveBeenCalled();
  });

  it('logs non-abort analysis failures and publishes an empty graph fallback', async () => {
    const error = new Error('boom');
    const state = createState({
      analyzer: {
        initialize: vi.fn(async () => undefined),
        analyze: vi.fn(async () => {
          throw error;
        }),
        registry: {
          notifyPostAnalyze: vi.fn(),
        },
      },
      analyzerInitialized: true,
    });
    const { handlers } = createHandlers();

    await executeGraphViewAnalysis(new AbortController().signal, 1, state, handlers);

    expect(handlers.logError).toHaveBeenCalledWith('[CodeGraphy] Analysis failed:', error);
    expect(handlers.setRawGraphData).toHaveBeenCalledWith({ nodes: [], edges: [] });
    expect(handlers.setGraphData).toHaveBeenCalledWith({ nodes: [], edges: [] });
    expect(handlers.sendGraphDataUpdated).toHaveBeenCalledWith({ nodes: [], edges: [] });
    expect(handlers.sendPluginStatuses).toHaveBeenCalledOnce();
    expect(handlers.markWorkspaceReady).toHaveBeenCalledWith({ nodes: [], edges: [] });
  });

  it('returns quietly for abort errors raised during analysis', async () => {
    const error = Object.assign(new Error('aborted'), { name: 'AbortError' });
    const state = createState({
      analyzer: {
        initialize: vi.fn(async () => undefined),
        analyze: vi.fn(async () => {
          throw error;
        }),
        registry: {
          notifyPostAnalyze: vi.fn(),
        },
      },
      analyzerInitialized: true,
    });
    const { handlers } = createHandlers({
      isAbortError: vi.fn(nextError => nextError === error),
    });

    await executeGraphViewAnalysis(new AbortController().signal, 1, state, handlers);

    expect(handlers.logError).not.toHaveBeenCalled();
    expect(handlers.setRawGraphData).not.toHaveBeenCalled();
    expect(handlers.sendPluginStatuses).not.toHaveBeenCalled();
    expect(handlers.markWorkspaceReady).not.toHaveBeenCalled();
  });
});
