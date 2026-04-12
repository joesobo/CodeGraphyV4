import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../../src/shared/graph/types';
import {
  createGraphViewProviderAnalysisState,
  createGraphViewProviderWorkspaceReadyState,
  setGraphViewProviderGraphData,
  setGraphViewProviderRawGraphData,
  syncGraphViewProviderAnalysisExecutionState,
  syncGraphViewProviderAnalysisState,
  syncGraphViewProviderWorkspaceReadyState,
} from '../../../../../src/extension/graphView/provider/analysis/state';
import type { GraphViewProviderAnalysisMethodsSource } from '../../../../../src/extension/graphView/provider/analysis/methods';

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
    _disabledPlugins: new Set<string>(['plugin-a']),
    _graphData: { nodes: [], edges: [] } satisfies IGraphData,
    _rawGraphData: { nodes: [], edges: [] } satisfies IGraphData,
    _firstAnalysis: true,
    _resolveFirstWorkspaceReady: vi.fn(),
    _sendMessage: vi.fn(),
    _sendDepthState: vi.fn(),
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

describe('graphView/provider/analysis/state', () => {
  it('creates and syncs the analysis request state', () => {
    const source = createSource({
      _analysisController: new AbortController(),
      _analysisRequestId: 2,
      _analyzerInitialized: true,
      _analyzerInitPromise: Promise.resolve(),
    });

    const state = createGraphViewProviderAnalysisState(source, 'analyze');
    state.analysisController = undefined;
    state.analysisRequestId = 7;

    syncGraphViewProviderAnalysisState(source, state);

    expect(source._analysisController).toBeUndefined();
    expect(source._analysisRequestId).toBe(7);
    expect(source._analyzerInitialized).toBe(true);
    expect(source._analyzerInitPromise).toBeInstanceOf(Promise);
  });

  it('exposes analyzer, filter, and disabled plugin state through the accessors', () => {
    const source = createSource({
      _analyzer: { initialize: vi.fn(async () => undefined) } as never,
      _analyzerInitPromise: Promise.resolve(),
    });
    const nextAnalyzer = { initialize: vi.fn(async () => undefined) } as never;
    const state = createGraphViewProviderAnalysisState(source, 'load');
    expect(state.mode).toBe('load');

    expect(state.analyzer).toBe(source._analyzer);
    expect(state.analyzerInitPromise).toBe(source._analyzerInitPromise);
    expect(state.filterPatterns).toEqual(['src/**']);
    expect([...state.disabledPlugins]).toEqual(['plugin-a']);

    state.analyzer = nextAnalyzer;
    state.filterPatterns = ['dist/**'];
    state.disabledPlugins = new Set<string>(['plugin-b']);

    expect(source._analyzer).toBe(nextAnalyzer);
    expect(source._filterPatterns).toEqual(['dist/**']);
    expect([...source._disabledPlugins]).toEqual(['plugin-b']);
  });

  it('syncs analysis request state from plain state snapshots', () => {
    const source = createSource();
    const analysisController = new AbortController();

    syncGraphViewProviderAnalysisState(
      source,
      {
        analysisController,
        analysisRequestId: 9,
        analyzer: source._analyzer,
        analyzerInitialized: source._analyzerInitialized,
        analyzerInitPromise: source._analyzerInitPromise,
        mode: 'analyze',
        filterPatterns: source._filterPatterns,
        disabledPlugins: source._disabledPlugins,
      } as never,
    );

    expect(source._analysisController).toBe(analysisController);
    expect(source._analysisRequestId).toBe(9);
  });

  it('syncs execution state updates from plain state snapshots', () => {
    const source = createSource();
    const analysisController = new AbortController();
    const analyzerInitPromise = Promise.resolve();

    syncGraphViewProviderAnalysisExecutionState(
      source,
      {
        analysisController,
        analysisRequestId: 9,
        analyzer: source._analyzer,
        analyzerInitialized: true,
        analyzerInitPromise,
        mode: 'analyze',
        filterPatterns: source._filterPatterns,
        disabledPlugins: source._disabledPlugins,
      } as never,
    );

    expect(source._analysisController).toBe(analysisController);
    expect(source._analysisRequestId).toBe(9);
    expect(source._analyzerInitialized).toBe(true);
    expect(source._analyzerInitPromise).toBe(analyzerInitPromise);
  });

  it('reflects analyzer initialization progress onto the provider source immediately', () => {
    const source = createSource();
    const state = createGraphViewProviderAnalysisState(source, 'analyze');
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
    const rawGraph = {
      nodes: [{ id: 'raw', label: 'raw', color: '#ffffff' }],
      edges: [],
    } satisfies IGraphData;
    const graph = {
      nodes: [{ id: 'graph', label: 'graph', color: '#ffffff' }],
      edges: [],
    } satisfies IGraphData;

    setGraphViewProviderRawGraphData(source, rawGraph);
    setGraphViewProviderGraphData(source, graph);

    expect(source._rawGraphData).toEqual(rawGraph);
    expect(source._graphData).toEqual(graph);
  });
});
