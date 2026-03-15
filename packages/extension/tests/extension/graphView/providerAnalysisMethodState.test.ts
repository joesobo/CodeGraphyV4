import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../src/shared/types';
import {
  createGraphViewProviderAnalysisState,
  createGraphViewProviderWorkspaceReadyState,
  setGraphViewProviderGraphData,
  setGraphViewProviderRawGraphData,
  syncGraphViewProviderAnalysisExecutionState,
  syncGraphViewProviderAnalysisState,
  syncGraphViewProviderWorkspaceReadyState,
} from '../../../src/extension/graphView/providerAnalysisMethodState';
import type { GraphViewProviderAnalysisMethodsSource } from '../../../src/extension/graphView/providerAnalysisMethods';

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
    _disabledRules: new Set<string>(['rule-a']),
    _disabledPlugins: new Set<string>(['plugin-a']),
    _graphData: { nodes: [], edges: [] },
    _rawGraphData: { nodes: [], edges: [] },
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
    ...overrides,
  };
}

describe('graphView/providerAnalysisMethodState', () => {
  it('creates and syncs the analysis request state', () => {
    const source = createSource({
      _analysisController: new AbortController(),
      _analysisRequestId: 2,
      _analyzerInitialized: true,
      _analyzerInitPromise: Promise.resolve(),
    });

    const state = createGraphViewProviderAnalysisState(source);
    state.analysisController = undefined;
    state.analysisRequestId = 7;

    syncGraphViewProviderAnalysisState(source, state);

    expect(source._analysisController).toBeUndefined();
    expect(source._analysisRequestId).toBe(7);
    expect(source._analyzerInitialized).toBe(true);
    expect(source._analyzerInitPromise).toBeInstanceOf(Promise);
  });

  it('syncs execution state updates, including analyzer initialization flags', () => {
    const source = createSource();
    const state = createGraphViewProviderAnalysisState(source);
    state.analysisController = new AbortController();
    state.analysisRequestId = 9;
    state.analyzerInitialized = true;
    state.analyzerInitPromise = Promise.resolve();

    syncGraphViewProviderAnalysisExecutionState(source, state);

    expect(source._analysisController).toBeInstanceOf(AbortController);
    expect(source._analysisRequestId).toBe(9);
    expect(source._analyzerInitialized).toBe(true);
    expect(source._analyzerInitPromise).toBeInstanceOf(Promise);
  });

  it('reflects analyzer initialization progress onto the provider source immediately', () => {
    const source = createSource();
    const state = createGraphViewProviderAnalysisState(source);
    const initializePromise = Promise.resolve();

    state.analyzerInitPromise = initializePromise;
    state.analyzerInitialized = true;

    expect(source._analyzerInitPromise).toBe(initializePromise);
    expect(source._analyzerInitialized).toBe(true);
  });

  it('creates and syncs the workspace-ready state', () => {
    const source = createSource();
    const state = createGraphViewProviderWorkspaceReadyState(source);
    state.firstAnalysis = false;
    state.resolveFirstWorkspaceReady = undefined;

    syncGraphViewProviderWorkspaceReadyState(source, state);

    expect(source._firstAnalysis).toBe(false);
    expect(source._resolveFirstWorkspaceReady).toBeUndefined();
  });

  it('updates raw and transformed graph data on the provider source', () => {
    const source = createSource();
    const rawGraph = { nodes: [{ id: 'raw' }], edges: [] } satisfies IGraphData;
    const graph = { nodes: [{ id: 'graph' }], edges: [] } satisfies IGraphData;

    setGraphViewProviderRawGraphData(source, rawGraph);
    setGraphViewProviderGraphData(source, graph);

    expect(source._rawGraphData).toEqual(rawGraph);
    expect(source._graphData).toEqual(graph);
  });
});
