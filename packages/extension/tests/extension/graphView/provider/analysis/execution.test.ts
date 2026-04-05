import { describe, expect, it, vi } from 'vitest';
import {
  createGraphViewProviderDoAnalyzeAndSendData,
} from '../../../../../src/extension/graphView/provider/analysis/execution';
import type {
  GraphViewProviderAnalysisMethodDependencies,
  GraphViewProviderAnalysisMethodsSource,
} from '../../../../../src/extension/graphView/provider/analysis/methods';

function createSource(
  overrides: Partial<GraphViewProviderAnalysisMethodsSource> = {},
): GraphViewProviderAnalysisMethodsSource {
  return {
    _analysisController: undefined,
    _analysisRequestId: 1,
    _analyzer: undefined,
    _analyzerInitialized: false,
    _analyzerInitPromise: undefined,
    _filterPatterns: ['src/**'],
    _disabledSources: new Set<string>(),
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
    ...overrides,
  };
}

function createDependencies(
  overrides: Partial<GraphViewProviderAnalysisMethodDependencies> = {},
): GraphViewProviderAnalysisMethodDependencies {
  return {
    runAnalysisRequest: vi.fn(async () => undefined),
    executeAnalysis: vi.fn(async () => undefined),
    markWorkspaceReady: vi.fn(),
    isAnalysisStale: vi.fn(() => false),
    isAbortError: vi.fn(() => false),
    hasWorkspace: vi.fn(() => true),
    logError: vi.fn(),
    ...overrides,
  };
}

describe('graphView/provider/analysis/execution', () => {
  it('executes analysis with delegate-backed handlers and syncs execution state', async () => {
    const source = createSource();
    const dependencies = createDependencies({
      executeAnalysis: vi.fn(async (_signal, requestId, state, handlers) => {
        expect(requestId).toBe(9);
        expect(state.filterPatterns).toEqual(['src/**']);
        handlers.setRawGraphData({ nodes: [{ id: 'raw' }], edges: [] });
        handlers.setGraphData({ nodes: [{ id: 'graph' }], edges: [] });
        handlers.markWorkspaceReady({ nodes: [{ id: 'graph' }], edges: [] });
        state.analysisController = new AbortController();
        state.analysisRequestId = 10;
        state.analyzerInitialized = true;
        state.analyzerInitPromise = Promise.resolve();
      }),
    });
    const delegates = {
      callMarkWorkspaceReady: vi.fn(),
      callIsAnalysisStale: vi.fn(() => false),
      callIsAbortError: vi.fn(() => false),
    };

    await createGraphViewProviderDoAnalyzeAndSendData(source, dependencies, delegates)(
      new AbortController().signal,
      9,
    );

    expect(source._rawGraphData).toEqual({ nodes: [{ id: 'raw' }], edges: [] });
    expect(source._graphData).toEqual({ nodes: [{ id: 'graph' }], edges: [] });
    expect(source._analysisRequestId).toBe(10);
    expect(source._analyzerInitialized).toBe(true);
    expect(delegates.callMarkWorkspaceReady).toHaveBeenCalledOnce();
  });
});
