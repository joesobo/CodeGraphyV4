import type { IGraphData } from '../../../../shared/graph/contracts';
import type {
  GraphViewAnalysisExecutionHandlers,
  GraphViewAnalysisExecutionState,
} from '../execution';

export const EMPTY_GRAPH_DATA: IGraphData = { nodes: [], edges: [] };

export function publishEmptyGraph(
  handlers: GraphViewAnalysisExecutionHandlers,
  hasIndex: boolean = false,
): IGraphData {
  handlers.setRawGraphData(EMPTY_GRAPH_DATA);
  handlers.setGraphData(EMPTY_GRAPH_DATA);
  handlers.sendGraphDataUpdated(EMPTY_GRAPH_DATA);
  handlers.sendGraphIndexStatusUpdated(hasIndex);
  handlers.sendDepthState();
  return EMPTY_GRAPH_DATA;
}

export function publishAnalyzedGraph(
  state: GraphViewAnalysisExecutionState,
  handlers: GraphViewAnalysisExecutionHandlers,
  rawGraphData: IGraphData,
  hasIndex: boolean,
): void {
  handlers.setRawGraphData(rawGraphData);
  handlers.sendGraphIndexStatusUpdated(hasIndex);
  handlers.updateViewContext();
  handlers.applyViewTransform();
  handlers.computeMergedGroups();
  handlers.sendGroupsUpdated();

  const graphData = handlers.getGraphData();
  handlers.sendGraphDataUpdated(graphData);
  handlers.sendDepthState();
  handlers.sendPluginStatuses();
  handlers.sendDecorations();
  handlers.sendContextMenuItems();
  handlers.sendPluginExporters?.();
  handlers.sendPluginToolbarActions?.();
  state.analyzer?.registry.notifyPostAnalyze(graphData);
  handlers.markWorkspaceReady(graphData);
}

export function publishAnalysisFailure(
  handlers: GraphViewAnalysisExecutionHandlers,
): void {
  const graphData = publishEmptyGraph(handlers);
  handlers.sendPluginStatuses();
  handlers.sendPluginExporters?.();
  handlers.sendPluginToolbarActions?.();
  handlers.markWorkspaceReady(graphData);
}
