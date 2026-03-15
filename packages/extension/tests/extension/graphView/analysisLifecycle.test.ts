import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../src/shared/types';
import {
  executeGraphViewProviderAnalysis,
  isGraphViewAbortError,
  isGraphViewAnalysisStale,
  markGraphViewWorkspaceReady,
  runGraphViewProviderAnalysisRequest,
  type GraphViewProviderAnalysisHandlers,
  type GraphViewProviderAnalysisState,
} from '../../../src/extension/graphView/analysisLifecycle';

function createState(
  overrides: Partial<GraphViewProviderAnalysisState> = {},
): GraphViewProviderAnalysisState {
  return {
    analysisController: undefined,
    analysisRequestId: 0,
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
  overrides: Partial<GraphViewProviderAnalysisHandlers> = {},
): GraphViewProviderAnalysisHandlers {
  let graphData: IGraphData = { nodes: [], edges: [] };

  return {
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
    markWorkspaceReady: vi.fn(),
    isAnalysisStale: vi.fn(() => false),
    isAbortError: vi.fn(() => false),
    logError: vi.fn(),
    ...overrides,
  };
}

describe('graph view provider analysis lifecycle helper', () => {
  it('runs the provider request flow and clears the active controller afterward', async () => {
    const state = createState({
      analysisController: new AbortController(),
    });
    const handlers = createHandlers();

    await runGraphViewProviderAnalysisRequest(state, {
      executeAnalysis: (signal, requestId) =>
        executeGraphViewProviderAnalysis(signal, requestId, state, handlers),
      isAbortError: error => isGraphViewAbortError(error),
      logError: handlers.logError,
    });

    expect(state.analysisRequestId).toBe(1);
    expect(state.analysisController).toBeUndefined();
    expect(handlers.sendGraphDataUpdated).toHaveBeenCalledWith({ nodes: [], edges: [] });
    expect(handlers.sendAvailableViews).toHaveBeenCalledOnce();
  });

  it('syncs analyzer initialization state after execution', async () => {
    const rawGraphData: IGraphData = { nodes: [{ id: 'src/index.ts' }], edges: [] };
    const state = createState({
      analysisRequestId: 1,
      analyzer: {
        initialize: vi.fn(() => Promise.resolve()),
        analyze: vi.fn(() => Promise.resolve(rawGraphData)),
        registry: {
          notifyPostAnalyze: vi.fn(),
        },
      },
    });
    const handlers = createHandlers();

    await executeGraphViewProviderAnalysis(new AbortController().signal, 1, state, handlers);

    expect(state.analyzerInitialized).toBe(true);
    expect(state.analyzerInitPromise).toBeUndefined();
    expect(state.analyzer?.initialize).toHaveBeenCalledOnce();
    expect(state.analyzer?.analyze).toHaveBeenCalledOnce();
  });

  it('marks workspace ready once and resolves waiters', () => {
    const resolveFirstWorkspaceReady = vi.fn();
    const workspaceReadyState = {
      firstAnalysis: true,
      resolveFirstWorkspaceReady,
    };
    const registry = {
      notifyWorkspaceReady: vi.fn(),
    };
    const graphData: IGraphData = { nodes: [{ id: 'src/index.ts' }], edges: [] };

    markGraphViewWorkspaceReady(workspaceReadyState, registry, graphData);
    markGraphViewWorkspaceReady(workspaceReadyState, registry, graphData);

    expect(workspaceReadyState.firstAnalysis).toBe(false);
    expect(workspaceReadyState.resolveFirstWorkspaceReady).toBeUndefined();
    expect(registry.notifyWorkspaceReady).toHaveBeenCalledTimes(1);
    expect(resolveFirstWorkspaceReady).toHaveBeenCalledTimes(1);
  });

  it('detects stale requests and abort errors', () => {
    const abortError = new Error('cancelled');
    abortError.name = 'AbortError';

    expect(isGraphViewAnalysisStale(new AbortController().signal, 2, 1)).toBe(true);
    expect(isGraphViewAnalysisStale(new AbortController().signal, 1, 1)).toBe(false);
    expect(isGraphViewAbortError(abortError)).toBe(true);
    expect(isGraphViewAbortError(new Error('boom'))).toBe(false);
    expect(isGraphViewAbortError('AbortError')).toBe(false);
  });
});
