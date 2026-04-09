import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../../src/shared/graph/types';
import {
  createGraphViewProviderAnalysisHandlers,
  createGraphViewProviderAnalysisRequestHandlers,
} from '../../../../../src/extension/graphView/provider/analysis/handlers';
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
    _filterPatterns: [],
    _disabledSources: new Set<string>(),
    _disabledPlugins: new Set<string>(),
    _graphData: { nodes: [], edges: [] } satisfies IGraphData,
    _rawGraphData: { nodes: [], edges: [] } satisfies IGraphData,
    _firstAnalysis: true,
    _resolveFirstWorkspaceReady: undefined,
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

describe('graphView/provider/analysis/handlers', () => {
  it('builds execution handlers that update provider state and delegate callbacks', () => {
    const source = createSource();
    const dependencies = createDependencies();
    const callbacks = {
      isAnalysisStale: vi.fn(() => true),
      isAbortError: vi.fn(() => true),
      markWorkspaceReady: vi.fn(),
    };
    const handlers = createGraphViewProviderAnalysisHandlers(source, dependencies, callbacks);
    const graphData = {
      nodes: [{ id: 'graph', label: 'graph', color: '#ffffff' }],
      edges: [],
    } satisfies IGraphData;

    expect(handlers.isAnalysisStale(new AbortController().signal, 4)).toBe(true);
    handlers.setRawGraphData({
      nodes: [{ id: 'raw', label: 'raw', color: '#ffffff' }],
      edges: [],
    });
    handlers.setGraphData(graphData);
    handlers.sendGraphDataUpdated(graphData);
    handlers.sendDepthState();
    handlers.computeMergedGroups();
    handlers.sendGroupsUpdated();
    handlers.updateViewContext();
    handlers.applyViewTransform();
    handlers.sendPluginStatuses();
    handlers.sendDecorations();
    handlers.sendContextMenuItems();
    handlers.markWorkspaceReady(graphData);
    expect(handlers.isAbortError(new Error('boom'))).toBe(true);
    handlers.logError('label', new Error('boom'));

    expect(source._rawGraphData).toEqual({
      nodes: [{ id: 'raw', label: 'raw', color: '#ffffff' }],
      edges: [],
    });
    expect(source._graphData).toEqual(graphData);
    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'GRAPH_DATA_UPDATED',
      payload: graphData,
    });
    expect(source._sendDepthState).toHaveBeenCalledOnce();
    expect(source._computeMergedGroups).toHaveBeenCalledOnce();
    expect(source._sendGroupsUpdated).toHaveBeenCalledOnce();
    expect(source._updateViewContext).toHaveBeenCalledOnce();
    expect(source._applyViewTransform).toHaveBeenCalledOnce();
    expect(source._sendPluginStatuses).toHaveBeenCalledOnce();
    expect(source._sendDecorations).toHaveBeenCalledOnce();
    expect(source._sendContextMenuItems).toHaveBeenCalledOnce();
    expect(callbacks.markWorkspaceReady).toHaveBeenCalledWith(graphData);
    expect(callbacks.isAbortError).toHaveBeenCalledOnce();
    expect(dependencies.logError).toHaveBeenCalledOnce();
  });

  it('builds request handlers that update live request state', async () => {
    const source = createSource();
    const dependencies = createDependencies();
    const callbacks = {
      executeAnalysis: vi.fn(async () => undefined),
      isAbortError: vi.fn(() => false),
    };
    const handlers = createGraphViewProviderAnalysisRequestHandlers(source, dependencies, callbacks);
    const controller = new AbortController();

    await handlers.executeAnalysis(controller.signal, 6);
    handlers.updateAnalysisController?.(controller);
    handlers.updateAnalysisRequestId?.(6);
    expect(handlers.isAbortError(new Error('boom'))).toBe(false);
    handlers.logError('label', new Error('boom'));

    expect(callbacks.executeAnalysis).toHaveBeenCalledWith(controller.signal, 6);
    expect(source._analysisController).toBe(controller);
    expect(source._analysisRequestId).toBe(6);
    expect(dependencies.logError).toHaveBeenCalledOnce();
  });
});
