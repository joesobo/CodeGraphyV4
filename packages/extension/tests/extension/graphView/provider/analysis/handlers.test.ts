import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../../src/shared/graph/contracts';
import type { ExtensionToWebviewMessage } from '../../../../../src/shared/protocol/extensionToWebview';
import {
  createGraphViewProviderAnalysisHandlers,
  createGraphViewProviderAnalysisRequestHandlers,
} from '../../../../../src/extension/graphView/provider/analysis/handlers';
import type {
  GraphViewProviderAnalysisMethodDependencies,
  GraphViewProviderAnalysisMethodsSource,
} from '../../../../../src/extension/graphView/provider/analysis/methods';

const handlerHarness = vi.hoisted(() => ({
  sendGraphControlsUpdated: vi.fn<
    (
      graphData: IGraphData,
      analyzer: unknown,
      sendMessage: (message: ExtensionToWebviewMessage) => void,
    ) => void
  >(),
}));

vi.mock('../../../../../src/extension/graphView/controls/send', () => ({
  sendGraphControlsUpdated: handlerHarness.sendGraphControlsUpdated,
}));

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
    emitDiagnostic: vi.fn(),
    ...overrides,
  };
}

describe('graphView/provider/analysis/handlers', () => {
  beforeEach(() => {
    handlerHarness.sendGraphControlsUpdated.mockReset();
  });

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
    handlers.markWorkspaceReady(graphData);
    expect(handlers.isAbortError(new Error('boom'))).toBe(true);
    handlers.logError('label', new Error('boom'));

    expect(source._rawGraphData).toEqual({
      nodes: [{ id: 'raw', label: 'raw', color: '#ffffff' }],
      edges: [],
    });
    expect(handlers.getRawGraphData?.()).toEqual(source._rawGraphData);
    expect(source._graphData).toEqual(graphData);
    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'GRAPH_DATA_UPDATED',
      payload: graphData,
    });
    expect(handlerHarness.sendGraphControlsUpdated).toHaveBeenCalledWith(
      source._rawGraphData,
      source._analyzer,
      expect.any(Function),
      undefined,
      source._disabledPlugins,
    );
    expect(source._sendDepthState).toHaveBeenCalledOnce();
    expect(source._computeMergedGroups).toHaveBeenCalledOnce();
    expect(source._sendGroupsUpdated).toHaveBeenCalledOnce();
    expect(source._updateViewContext).toHaveBeenCalledOnce();
    expect(source._applyViewTransform).toHaveBeenCalledOnce();
    expect(source._sendPluginStatuses).toHaveBeenCalledOnce();
    expect(source._sendDecorations).toHaveBeenCalledOnce();
    expect(callbacks.markWorkspaceReady).toHaveBeenCalledWith(graphData, undefined);
    expect(callbacks.isAbortError).toHaveBeenCalledOnce();
    expect(dependencies.logError).toHaveBeenCalledOnce();
  });

  it('forwards graph-control, index, and plugin broadcast messages through the source sender', () => {
    const source = createSource({
      _analyzer: { id: 'analyzer' } as never,
    });
    const dependencies = createDependencies({ hasWorkspace: vi.fn(() => false) });
    const callbacks = {
      isAnalysisStale: vi.fn(() => false),
      isAbortError: vi.fn(() => false),
      markWorkspaceReady: vi.fn(),
    };
    const handlers = createGraphViewProviderAnalysisHandlers(source, dependencies, callbacks);
    const graphData = { nodes: [], edges: [] } satisfies IGraphData;
    const progress = { phase: 'indexing', current: 2, total: 5 };

    handlerHarness.sendGraphControlsUpdated.mockImplementation((_graphData, _analyzer, sendMessage) => {
      sendMessage({
        type: 'GRAPH_CONTROLS_UPDATED',
        payload: {
          nodeTypes: [],
          edgeTypes: [],
          nodeColors: {},
          nodeVisibility: {},
          edgeVisibility: {},
        },
      });
    });

    expect(handlers.hasWorkspace()).toBe(false);
    expect(handlers.getRawGraphData?.()).toBe(source._rawGraphData);
    expect(handlers.getGraphData()).toBe(source._graphData);

    handlers.sendGraphDataUpdated(graphData);
    handlers.sendGraphIndexStatusUpdated(true, 'fresh', 'CodeGraphy index is fresh.');
    if (handlers.sendIndexProgress) {
      handlers.sendIndexProgress(progress);
    }
    expect(handlerHarness.sendGraphControlsUpdated).toHaveBeenCalledWith(
      graphData,
      source._analyzer,
      expect.any(Function),
      undefined,
      source._disabledPlugins,
    );
    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'GRAPH_CONTROLS_UPDATED',
      payload: {
        nodeTypes: [],
        edgeTypes: [],
        nodeColors: {},
        nodeVisibility: {},
        edgeVisibility: {},
      },
    });
    expect(source._sendMessage).toHaveBeenNthCalledWith(1, {
      type: 'GRAPH_CONTROLS_UPDATED',
      payload: {
        nodeTypes: [],
        edgeTypes: [],
        nodeColors: {},
        nodeVisibility: {},
        edgeVisibility: {},
      },
    });
    expect(source._sendMessage).toHaveBeenNthCalledWith(2, {
      type: 'GRAPH_DATA_UPDATED',
      payload: graphData,
    });
    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'GRAPH_INDEX_STATUS_UPDATED',
      payload: {
        hasIndex: true,
        freshness: 'fresh',
        detail: 'CodeGraphy index is fresh.',
      },
    });
    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'GRAPH_INDEX_PROGRESS',
      payload: progress,
    });
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
    handlers.emitDiagnostic?.({
      area: 'extension.analysis',
      event: 'request-started',
      context: { requestId: 6 },
    });

    expect(callbacks.executeAnalysis).toHaveBeenCalledWith(controller.signal, 6);
    expect(source._analysisController).toBe(controller);
    expect(source._analysisRequestId).toBe(6);
    expect(dependencies.logError).toHaveBeenCalledOnce();
    expect(dependencies.emitDiagnostic).toHaveBeenCalledWith({
      area: 'extension.analysis',
      event: 'request-started',
      context: { requestId: 6 },
    });
  });
});
