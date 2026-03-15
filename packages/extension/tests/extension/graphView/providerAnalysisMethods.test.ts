import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../src/shared/types';
import { createGraphViewProviderAnalysisMethods } from '../../../src/extension/graphView/providerAnalysisMethods';

describe('graphView/providerAnalysisMethods', () => {
  it('runs analysis request handlers and syncs request state back onto the provider source', async () => {
    const source = {
      _analysisController: undefined,
      _analysisRequestId: 0,
      _analyzer: undefined,
      _analyzerInitialized: false,
      _analyzerInitPromise: undefined,
      _filterPatterns: [],
      _disabledRules: new Set<string>(),
      _disabledPlugins: new Set<string>(),
      _graphData: { nodes: [], edges: [] } satisfies IGraphData,
      _rawGraphData: { nodes: [], edges: [] } satisfies IGraphData,
      _firstAnalysis: true,
      _resolveFirstWorkspaceReady: undefined,
      _sendMessage: vi.fn(),
      _sendAvailableViews: vi.fn(),
      _computeMergedGroups: vi.fn(),
      _sendGroupsUpdated: vi.fn(),
      _updateViewContext: vi.fn(),
      _applyViewTransform: vi.fn(),
      _sendPluginStatuses: vi.fn(),
      _sendDecorations: vi.fn(),
      _sendContextMenuItems: vi.fn(),
    };
    const executeAnalysis = vi.fn(async () => undefined);
    const runAnalysisRequest = vi.fn(async (state, handlers) => {
      state.analysisController = new AbortController();
      state.analysisRequestId = 3;
      await handlers.executeAnalysis(state.analysisController.signal, state.analysisRequestId);
    });
    const methods = createGraphViewProviderAnalysisMethods(source as never, {
      runAnalysisRequest,
      executeAnalysis,
      markWorkspaceReady: vi.fn(),
      isAnalysisStale: vi.fn(() => false),
      isAbortError: vi.fn(() => false),
      hasWorkspace: vi.fn(() => true),
      logError: vi.fn(),
    });

    await methods._analyzeAndSendData();

    expect(runAnalysisRequest).toHaveBeenCalledOnce();
    expect(executeAnalysis).toHaveBeenCalledOnce();
    expect(source._analysisController).toBeInstanceOf(AbortController);
    expect(source._analysisRequestId).toBe(3);
  });

  it('executes analysis, publishes graph updates, and syncs analyzer state', async () => {
    const source = {
      _analysisController: undefined,
      _analysisRequestId: 1,
      _analyzer: { registry: { notifyWorkspaceReady: vi.fn() } },
      _analyzerInitialized: false,
      _analyzerInitPromise: undefined,
      _filterPatterns: ['dist/**'],
      _disabledRules: new Set<string>(['rule']),
      _disabledPlugins: new Set<string>(['plugin']),
      _graphData: { nodes: [], edges: [] } satisfies IGraphData,
      _rawGraphData: { nodes: [], edges: [] } satisfies IGraphData,
      _firstAnalysis: true,
      _resolveFirstWorkspaceReady: vi.fn(),
      _sendMessage: vi.fn(),
      _sendAvailableViews: vi.fn(),
      _computeMergedGroups: vi.fn(),
      _sendGroupsUpdated: vi.fn(),
      _updateViewContext: vi.fn(),
      _applyViewTransform: vi.fn(),
      _sendPluginStatuses: vi.fn(),
      _sendDecorations: vi.fn(),
      _sendContextMenuItems: vi.fn(),
    };
    const executeAnalysis = vi.fn(async (_signal, requestId, state, handlers) => {
      expect(requestId).toBe(7);
      expect(state.filterPatterns).toEqual(['dist/**']);
      handlers.setRawGraphData({ nodes: [{ id: 'raw' }], edges: [] });
      handlers.setGraphData({ nodes: [{ id: 'graph' }], edges: [] });
      handlers.sendGraphDataUpdated({ nodes: [{ id: 'graph' }], edges: [] });
      handlers.sendAvailableViews();
      handlers.computeMergedGroups();
      handlers.sendGroupsUpdated();
      handlers.updateViewContext();
      handlers.applyViewTransform();
      handlers.sendPluginStatuses();
      handlers.sendDecorations();
      handlers.sendContextMenuItems();
      handlers.markWorkspaceReady({ nodes: [{ id: 'graph' }], edges: [] });
      state.analysisController = new AbortController();
      state.analysisRequestId = 9;
      state.analyzerInitialized = true;
      state.analyzerInitPromise = Promise.resolve();
    });
    const markWorkspaceReady = vi.fn((state) => {
      state.firstAnalysis = false;
      state.resolveFirstWorkspaceReady = undefined;
    });
    const methods = createGraphViewProviderAnalysisMethods(source as never, {
      runAnalysisRequest: vi.fn(async () => undefined),
      executeAnalysis,
      markWorkspaceReady,
      isAnalysisStale: vi.fn(() => false),
      isAbortError: vi.fn(() => false),
      hasWorkspace: vi.fn(() => true),
      logError: vi.fn(),
    });

    await methods._doAnalyzeAndSendData(new AbortController().signal, 7);

    expect(source._rawGraphData).toEqual({ nodes: [{ id: 'raw' }], edges: [] });
    expect(source._graphData).toEqual({ nodes: [{ id: 'graph' }], edges: [] });
    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'GRAPH_DATA_UPDATED',
      payload: { nodes: [{ id: 'graph' }], edges: [] },
    });
    expect(markWorkspaceReady).toHaveBeenCalledOnce();
    expect(source._firstAnalysis).toBe(false);
    expect(source._resolveFirstWorkspaceReady).toBeUndefined();
    expect(source._analysisRequestId).toBe(9);
    expect(source._analyzerInitialized).toBe(true);
    expect(source._analyzerInitPromise).toBeInstanceOf(Promise);
  });

  it('delegates stale and abort checks to dependencies', () => {
    const dependencies = {
      runAnalysisRequest: vi.fn(async () => undefined),
      executeAnalysis: vi.fn(async () => undefined),
      markWorkspaceReady: vi.fn(),
      isAnalysisStale: vi.fn(() => true),
      isAbortError: vi.fn(() => true),
      hasWorkspace: vi.fn(() => true),
      logError: vi.fn(),
    };
    const methods = createGraphViewProviderAnalysisMethods({
      _analysisController: undefined,
      _analysisRequestId: 4,
      _analyzer: undefined,
      _analyzerInitialized: false,
      _analyzerInitPromise: undefined,
      _filterPatterns: [],
      _disabledRules: new Set<string>(),
      _disabledPlugins: new Set<string>(),
      _graphData: { nodes: [], edges: [] },
      _rawGraphData: { nodes: [], edges: [] },
      _firstAnalysis: true,
      _resolveFirstWorkspaceReady: undefined,
      _sendMessage: vi.fn(),
      _sendAvailableViews: vi.fn(),
      _computeMergedGroups: vi.fn(),
      _sendGroupsUpdated: vi.fn(),
      _updateViewContext: vi.fn(),
      _applyViewTransform: vi.fn(),
      _sendPluginStatuses: vi.fn(),
      _sendDecorations: vi.fn(),
      _sendContextMenuItems: vi.fn(),
    } as never, dependencies);

    expect(methods._isAnalysisStale(new AbortController().signal, 2)).toBe(true);
    expect(methods._isAbortError(new Error('boom'))).toBe(true);
    expect(dependencies.isAnalysisStale).toHaveBeenCalledWith(expect.any(AbortSignal), 2, 4);
    expect(dependencies.isAbortError).toHaveBeenCalledOnce();
  });
});
