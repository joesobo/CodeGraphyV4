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
  it('publishes an empty graph when no analyzer exists', async () => {
    const state = createState();
    const { handlers } = createHandlers();

    await executeGraphViewAnalysis(new AbortController().signal, 1, state, handlers);

    expect(handlers.setRawGraphData).toHaveBeenCalledWith({ nodes: [], edges: [] });
    expect(handlers.setGraphData).toHaveBeenCalledWith({ nodes: [], edges: [] });
    expect(handlers.sendGraphDataUpdated).toHaveBeenCalledWith({ nodes: [], edges: [] });
    expect(handlers.sendAvailableViews).toHaveBeenCalledOnce();
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
});
