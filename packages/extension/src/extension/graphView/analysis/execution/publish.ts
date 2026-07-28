import type { IGraphData } from '../../../../shared/graph/contracts';
import type {
  GraphViewAnalysisExecutionHandlers,
  GraphViewAnalysisExecutionState,
} from '../execution';
import {
  publishGraphDataMessage,
  publishRawGraphUpdate,
  publishStaticGraphMessages,
} from './publish/messages';
import {
  resolveGraphIndexStatus,
  shouldReportGraphViewUpdateProgress,
} from './publish/status';

export const EMPTY_GRAPH_DATA: IGraphData = { nodes: [], edges: [] };

export function publishEmptyGraph(
  handlers: GraphViewAnalysisExecutionHandlers,
  hasIndex: boolean = false,
): IGraphData {
  const status = resolveGraphIndexStatus(undefined, hasIndex);
  handlers.setRawGraphData(EMPTY_GRAPH_DATA);
  handlers.setGraphData(EMPTY_GRAPH_DATA);
  handlers.sendGraphDataUpdated(EMPTY_GRAPH_DATA);
  handlers.sendGraphIndexStatusUpdated(hasIndex, status.freshness, status.detail);
  handlers.sendDepthState();
  return EMPTY_GRAPH_DATA;
}

export function publishAnalyzedGraph(
  state: GraphViewAnalysisExecutionState,
  handlers: GraphViewAnalysisExecutionHandlers,
  rawGraphData: IGraphData,
  hasIndex: boolean,
): void {
  const actualHasIndex = state.analyzer?.hasIndex() ?? hasIndex;
  const status = resolveGraphIndexStatus(state, actualHasIndex);

  if (shouldReportGraphViewUpdateProgress(state)) {
    handlers.sendIndexProgress?.({
      phase: 'Updating Graph View',
      current: 0,
      total: 1,
    });
  }

  publishRawGraphUpdate(handlers, rawGraphData);

  const graphData = handlers.getGraphData();
  publishStaticGraphMessages(handlers);
  publishGraphDataMessage(handlers, graphData);

  handlers.sendGraphIndexStatusUpdated(actualHasIndex, status.freshness, status.detail);
  state.analyzer?.registry.notifyPostAnalyze(graphData, state.disabledPlugins);
  handlers.markWorkspaceReady(graphData, state.disabledPlugins);
}

export function publishAnalysisFailure(
  handlers: GraphViewAnalysisExecutionHandlers,
): void {
  const graphData = publishEmptyGraph(handlers);
  handlers.sendPluginStatuses();
  handlers.sendPluginWebviewInjections?.();
  handlers.markWorkspaceReady(graphData);
}
