import type { IGraphData } from '../../../../shared/graph/contracts';
import type {
  GraphViewProviderAnalysisHandlers,
  GraphViewProviderAnalysisRequestHandlers,
} from '../../analysis/lifecycle';
import {
  sendGraphDataUpdated,
  sendGraphIndexStatusUpdated,
  sendGraphNodeMetricsUpdated,
} from './handlers/messages';
import type {
  GraphViewProviderAnalysisMethodDependencies,
  GraphViewProviderAnalysisMethodsSource,
} from './methods';
import {
  setGraphViewProviderGraphData,
  setGraphViewProviderRawGraphData,
} from './state';

interface GraphViewProviderAnalysisHandlerCallbacks {
  executeAnalysis(signal: AbortSignal, requestId: number): Promise<void>;
  isAnalysisStale(signal: AbortSignal, requestId: number): boolean;
  isAbortError(error: unknown): boolean;
  markWorkspaceReady(graph: IGraphData, disabledPlugins?: ReadonlySet<string>): void;
}

export function createGraphViewProviderAnalysisHandlers(
  source: GraphViewProviderAnalysisMethodsSource,
  dependencies: GraphViewProviderAnalysisMethodDependencies,
  callbacks: Omit<GraphViewProviderAnalysisHandlerCallbacks, 'executeAnalysis'>,
): GraphViewProviderAnalysisHandlers {
  return {
    isAnalysisStale: (signal, requestId) => callbacks.isAnalysisStale(signal, requestId),
    hasWorkspace: () => dependencies.hasWorkspace(),
    setRawGraphData: graphData => {
      setGraphViewProviderRawGraphData(source, graphData);
    },
    setGraphData: graphData => {
      setGraphViewProviderGraphData(source, graphData);
    },
    getRawGraphData: () => source._rawGraphData,
    getGraphData: () => source._graphData,
    sendGraphDataUpdated: graphData => sendGraphDataUpdated(source, graphData),
    sendGraphNodeMetricsUpdated: updates => sendGraphNodeMetricsUpdated(source, updates),
    sendDepthState: () => source._sendDepthState(),
    computeMergedGroups: () => source._computeMergedGroups(),
    sendGroupsUpdated: () => source._sendGroupsUpdated(),
    updateViewContext: () => source._updateViewContext(),
    applyViewTransform: () => source._applyViewTransform(),
    sendPluginStatuses: () => source._sendPluginStatuses(),
    sendDecorations: () => source._sendDecorations(),
    sendContextMenuItems: () => source._sendContextMenuItems(),
    sendGraphIndexStatusUpdated: (hasIndex, freshness, detail) =>
      sendGraphIndexStatusUpdated(source, hasIndex, freshness, detail),
    sendIndexProgress: progress => {
      source._sendMessage({ type: 'GRAPH_INDEX_PROGRESS', payload: progress });
    },
    sendPluginExporters: () => source._sendPluginExporters?.(),
    sendPluginToolbarActions: () => source._sendPluginToolbarActions?.(),
    sendGraphViewContributionStatuses: () => source._sendGraphViewContributionStatuses?.(),
    sendPluginWebviewInjections: () => source._sendPluginWebviewInjections?.(),
    markWorkspaceReady: (graphData, disabledPlugins) =>
      callbacks.markWorkspaceReady(graphData, disabledPlugins),
    isAbortError: error => callbacks.isAbortError(error),
    logError: (message, error) => {
      dependencies.logError(message, error);
    },
    emitDiagnostic: input => dependencies.emitDiagnostic?.(input),
  };
}

export function createGraphViewProviderAnalysisRequestHandlers(
  source: GraphViewProviderAnalysisMethodsSource,
  dependencies: GraphViewProviderAnalysisMethodDependencies,
  callbacks: Pick<GraphViewProviderAnalysisHandlerCallbacks, 'executeAnalysis' | 'isAbortError'>,
): GraphViewProviderAnalysisRequestHandlers {
  return {
    executeAnalysis: (signal, requestId) => callbacks.executeAnalysis(signal, requestId),
    isAbortError: error => callbacks.isAbortError(error),
    logError: (message, error) => {
      dependencies.logError(message, error);
    },
    emitDiagnostic: input => dependencies.emitDiagnostic?.(input),
    updateAnalysisController: controller => {
      source._analysisController = controller;
    },
    updateAnalysisRequestId: requestId => {
      source._analysisRequestId = requestId;
    },
  };
}
