import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../src/shared/graph/contracts';
import {
  executeGraphViewProviderAnalysis,
  isGraphViewAbortError,
  isGraphViewAnalysisStale,
  markGraphViewWorkspaceReady,
  runGraphViewProviderAnalysisRequest,
  type GraphViewProviderAnalysisHandlers,
  type GraphViewProviderAnalysisState,
} from '../../../../src/extension/graphView/analysis/lifecycle';

function createState(
  overrides: Partial<GraphViewProviderAnalysisState> = {},
): GraphViewProviderAnalysisState {
  return {
    analysisController: undefined,
    analysisRequestId: 0,
    analyzer: undefined,
    analyzerInitialized: false,
    analyzerInitPromise: undefined,
    mode: 'analyze',
    filterPatterns: [],
    disabledPlugins: new Set<string>(),
    ...overrides,
  };
}

function createAnalyzer(overrides: Partial<NonNullable<GraphViewProviderAnalysisState['analyzer']>> = {}) {
  return {
    initialize: vi.fn(async () => undefined),
    hasIndex: vi.fn(() => true),
    discoverGraph: vi.fn(async () => ({ nodes: [], edges: [] })),
    analyze: vi.fn(async () => ({ nodes: [], edges: [] })),
    registry: {
      notifyPostAnalyze: vi.fn(),
    },
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
    sendDepthState: vi.fn(),
    computeMergedGroups: vi.fn(),
    sendGroupsUpdated: vi.fn(),
    updateViewContext: vi.fn(),
    applyViewTransform: vi.fn(),
    sendPluginStatuses: vi.fn(),
    sendDecorations: vi.fn(),
    sendContextMenuItems: vi.fn(),
    sendGraphIndexStatusUpdated: vi.fn(),
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
    const updateAnalysisController = vi.fn();
    const updateAnalysisRequestId = vi.fn();

    await runGraphViewProviderAnalysisRequest(state, {
      executeAnalysis: (signal, requestId) =>
        executeGraphViewProviderAnalysis(signal, requestId, state, handlers),
      isAbortError: error => isGraphViewAbortError(error),
      logError: handlers.logError,
      updateAnalysisController,
      updateAnalysisRequestId,
    });

    expect(state.analysisRequestId).toBe(1);
    expect(state.analysisController).toBeUndefined();
    expect(handlers.sendGraphDataUpdated).toHaveBeenCalledWith({ nodes: [], edges: [] });
    expect(handlers.sendDepthState).toHaveBeenCalledOnce();
    expect(updateAnalysisController).toHaveBeenNthCalledWith(
      1,
      expect.any(AbortController),
    );
    expect(updateAnalysisController).toHaveBeenLastCalledWith(undefined);
    expect(updateAnalysisRequestId).toHaveBeenCalledWith(1);
  });

  it('updates request state even when optional request update callbacks are absent', async () => {
    const state = createState();
    const handlers = createHandlers();

    await expect(
      runGraphViewProviderAnalysisRequest(state, {
        executeAnalysis: (signal, requestId) =>
          executeGraphViewProviderAnalysis(signal, requestId, state, handlers),
        isAbortError: error => isGraphViewAbortError(error),
        logError: handlers.logError,
      }),
    ).resolves.toBeUndefined();

    expect(state.analysisRequestId).toBe(1);
    expect(state.analysisController).toBeUndefined();
  });

  it('syncs analyzer initialization state after execution', async () => {
    const rawGraphData: IGraphData = {
      nodes: [{ id: 'src/index.ts', label: 'src/index.ts', color: '#ffffff' }],
      edges: [],
    };
    const state = createState({
      analysisRequestId: 1,
      analyzer: createAnalyzer({
        analyze: vi.fn(() => Promise.resolve(rawGraphData)),
      }),
    });
    const handlers = createHandlers();

    await executeGraphViewProviderAnalysis(new AbortController().signal, 1, state, handlers);

    expect(state.analyzerInitialized).toBe(true);
    expect(state.analyzerInitPromise).toBeUndefined();
    expect(state.analyzer?.initialize).toHaveBeenCalledOnce();
    expect(state.analyzer?.analyze).toHaveBeenCalledOnce();
  });

  it('forwards stale and abort checks through the provider wrappers', async () => {
    const abortController = new AbortController();
    const abortError = new Error('cancelled');
    abortError.name = 'AbortError';
    const state = createState({
      analysisRequestId: 1,
      analyzer: createAnalyzer({
        analyze: vi.fn(() => Promise.reject(abortError)),
      }),
    });
    const handlers = createHandlers({
      isAnalysisStale: vi.fn(() => false),
      isAbortError: vi.fn(() => true),
    });

    await executeGraphViewProviderAnalysis(abortController.signal, 1, state, handlers);

    expect(handlers.isAnalysisStale).toHaveBeenCalledWith(abortController.signal, 1);
    expect(handlers.isAbortError).toHaveBeenCalledWith(expect.anything());
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
    const graphData: IGraphData = {
      nodes: [{ id: 'src/index.ts', label: 'src/index.ts', color: '#ffffff' }],
      edges: [],
    };

    markGraphViewWorkspaceReady(workspaceReadyState, registry, graphData);
    markGraphViewWorkspaceReady(workspaceReadyState, registry, graphData);

    expect(workspaceReadyState.firstAnalysis).toBe(false);
    expect(workspaceReadyState.resolveFirstWorkspaceReady).toBeUndefined();
    expect(registry.notifyWorkspaceReady).toHaveBeenCalledTimes(1);
    expect(resolveFirstWorkspaceReady).toHaveBeenCalledTimes(1);
  });

  it('marks first analysis complete without requiring registry listeners', () => {
    const workspaceReadyState = {
      firstAnalysis: true,
      resolveFirstWorkspaceReady: undefined,
    };

    expect(() =>
      markGraphViewWorkspaceReady(workspaceReadyState, undefined, {
        nodes: [],
        edges: [],
      }),
    ).not.toThrow();
    expect(workspaceReadyState.firstAnalysis).toBe(false);
    expect(workspaceReadyState.resolveFirstWorkspaceReady).toBeUndefined();
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

  it('marks workspace ready without requiring a waiting promise', () => {
    const registry = {
      notifyWorkspaceReady: vi.fn(),
    };
    const workspaceReadyState = {
      firstAnalysis: true,
      resolveFirstWorkspaceReady: undefined,
    };

    markGraphViewWorkspaceReady(workspaceReadyState, registry, {
      nodes: [],
      edges: [],
    });

    expect(registry.notifyWorkspaceReady).toHaveBeenCalledOnce();
    expect(workspaceReadyState.firstAnalysis).toBe(false);
  });
});
