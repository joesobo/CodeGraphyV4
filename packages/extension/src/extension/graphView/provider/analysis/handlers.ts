import type { IGraphData } from '../../../../shared/graph/types';
import type {
  GraphViewProviderAnalysisHandlers,
  GraphViewProviderAnalysisRequestHandlers,
} from '../../analysis/lifecycle';
import { sendGraphControlsUpdated } from '../../controls/send';
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
  markWorkspaceReady(graph: IGraphData): void;
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
    getGraphData: () => source._graphData,
    sendGraphDataUpdated: graphData => {
      source._sendMessage({ type: 'GRAPH_DATA_UPDATED', payload: graphData });
      sendGraphControlsUpdated(
        graphData,
        source._analyzer,
        message => source._sendMessage(message),
      );
    },
    sendAvailableViews: () => source._sendAvailableViews(),
    computeMergedGroups: () => source._computeMergedGroups(),
    sendGroupsUpdated: () => source._sendGroupsUpdated(),
    updateViewContext: () => source._updateViewContext(),
    applyViewTransform: () => source._applyViewTransform(),
    sendPluginStatuses: () => source._sendPluginStatuses(),
    sendDecorations: () => source._sendDecorations(),
    sendContextMenuItems: () => source._sendContextMenuItems(),
    sendGraphIndexStatusUpdated: hasIndex => {
      source._sendMessage({ type: 'GRAPH_INDEX_STATUS_UPDATED', payload: { hasIndex } });
    },
    sendIndexProgress: progress => {
      source._sendMessage({ type: 'GRAPH_INDEX_PROGRESS', payload: progress });
    },
    sendPluginExporters: () => source._sendPluginExporters?.(),
    sendPluginToolbarActions: () => source._sendPluginToolbarActions?.(),
    markWorkspaceReady: graphData => callbacks.markWorkspaceReady(graphData),
    isAbortError: error => callbacks.isAbortError(error),
    logError: (message, error) => {
      dependencies.logError(message, error);
    },
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
    updateAnalysisController: controller => {
      source._analysisController = controller;
    },
    updateAnalysisRequestId: requestId => {
      source._analysisRequestId = requestId;
    },
  };
}
