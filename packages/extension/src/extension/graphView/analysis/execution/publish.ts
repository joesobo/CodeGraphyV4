import type { IGraphData } from '../../../../shared/graph/contracts';
import type {
  GraphViewAnalysisExecutionHandlers,
  GraphViewAnalysisExecutionState,
} from '../execution';
import type { CodeGraphyIndexFreshness } from '../../../repoSettings/freshness';

export const EMPTY_GRAPH_DATA: IGraphData = { nodes: [], edges: [] };

function resolveGraphIndexStatus(
  state: GraphViewAnalysisExecutionState | undefined,
  hasIndex: boolean,
): { freshness: CodeGraphyIndexFreshness; detail: string } {
  const status = state?.analyzer?.getIndexStatus?.();
  if (status) {
    return status;
  }

  return {
    freshness: hasIndex ? 'fresh' : 'missing',
    detail: hasIndex
      ? 'CodeGraphy index is fresh.'
      : 'CodeGraphy index is missing. Index the repo to build the graph.',
  };
}

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
  const status = resolveGraphIndexStatus(state, hasIndex);
  handlers.setRawGraphData(rawGraphData);
  handlers.sendGraphIndexStatusUpdated(hasIndex, status.freshness, status.detail);
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
