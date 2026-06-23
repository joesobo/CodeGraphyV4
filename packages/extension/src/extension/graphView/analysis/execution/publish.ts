import type { IGraphData } from '../../../../shared/graph/contracts';
import type {
  GraphViewAnalysisExecutionHandlers,
  GraphViewAnalysisExecutionState,
} from '../execution';
import type { CodeGraphyIndexFreshness } from '../../../repoSettings/freshness';
import { recordExtensionPerformanceEvent } from '../../../performance/marks';

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
      : 'CodeGraphy index is missing. Index the workspace to build the graph.',
  };
}

function shouldReportGraphViewUpdateProgress(
  state: GraphViewAnalysisExecutionState,
): boolean {
  return state.mode === 'index' || state.mode === 'refresh' || state.mode === 'incremental';
}

function recordPublishStage(
  stage: string,
  startedAt: number,
  detail: Record<string, unknown> = {},
): void {
  recordExtensionPerformanceEvent(`graphAnalysis.publish.${stage}`, {
    durationMs: Date.now() - startedAt,
    ...detail,
  });
}

function areGraphDataPayloadsEqual(left: IGraphData, right: IGraphData): boolean {
  if (left === right) {
    return true;
  }

  if (left.nodes.length !== right.nodes.length || left.edges.length !== right.edges.length) {
    return false;
  }

  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
}

function canReuseCurrentGraphPublication(
  state: GraphViewAnalysisExecutionState,
  handlers: GraphViewAnalysisExecutionHandlers,
  rawGraphData: IGraphData,
  actualHasIndex: boolean,
  freshness: CodeGraphyIndexFreshness,
): boolean {
  if (state.mode !== 'incremental' || !actualHasIndex || freshness !== 'fresh') {
    return false;
  }

  const currentRawGraphData = handlers.getRawGraphData?.();
  return currentRawGraphData
    ? areGraphDataPayloadsEqual(currentRawGraphData, rawGraphData)
    : false;
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
  const actualHasIndex = state.analyzer?.hasIndex() ?? hasIndex;
  const status = resolveGraphIndexStatus(state, actualHasIndex);
  if (shouldReportGraphViewUpdateProgress(state)) {
    handlers.sendIndexProgress?.({
      phase: 'Updating Graph View',
      current: 0,
      total: 1,
    });
  }

  let stageStartedAt = Date.now();
  const reuseCurrentGraphPublication = canReuseCurrentGraphPublication(
    state,
    handlers,
    rawGraphData,
    actualHasIndex,
    status.freshness,
  );
  recordPublishStage('reuseCheck', stageStartedAt, {
    mode: state.mode,
    reused: reuseCurrentGraphPublication,
    rawEdgeCount: rawGraphData.edges.length,
    rawNodeCount: rawGraphData.nodes.length,
  });

  stageStartedAt = Date.now();
  if (reuseCurrentGraphPublication) {
    recordPublishStage('unchangedGraph', stageStartedAt, {
      edgeCount: rawGraphData.edges.length,
      nodeCount: rawGraphData.nodes.length,
    });
  } else {
    handlers.setRawGraphData(rawGraphData);
    recordPublishStage('setRawGraphData', stageStartedAt, {
      rawEdgeCount: rawGraphData.edges.length,
      rawNodeCount: rawGraphData.nodes.length,
    });

    stageStartedAt = Date.now();
    handlers.updateViewContext();
    handlers.applyViewTransform();
    recordPublishStage('viewTransform', stageStartedAt);

    stageStartedAt = Date.now();
    handlers.computeMergedGroups();
    handlers.sendGroupsUpdated();
    recordPublishStage('groups', stageStartedAt);
  }

  stageStartedAt = Date.now();
  handlers.sendDepthState();
  handlers.sendPluginStatuses();
  handlers.sendDecorations();
  handlers.sendContextMenuItems();
  handlers.sendPluginExporters?.();
  handlers.sendPluginToolbarActions?.();
  handlers.sendGraphViewContributionStatuses?.();
  handlers.sendPluginWebviewInjections?.();
  recordPublishStage('broadcasts', stageStartedAt);

  stageStartedAt = Date.now();
  const graphData = handlers.getGraphData();
  recordPublishStage('getGraphData', stageStartedAt, {
    edgeCount: graphData.edges.length,
    nodeCount: graphData.nodes.length,
  });
  recordExtensionPerformanceEvent('graphAnalysis.publish.graph', {
    mode: state.mode,
    rawNodeCount: rawGraphData.nodes.length,
    rawEdgeCount: rawGraphData.edges.length,
    nodeCount: graphData.nodes.length,
    edgeCount: graphData.edges.length,
    hasIndex: actualHasIndex,
    freshness: status.freshness,
  });
  if (!reuseCurrentGraphPublication) {
    stageStartedAt = Date.now();
    handlers.sendGraphDataUpdated(graphData);
    recordPublishStage('sendGraphData', stageStartedAt, {
      edgeCount: graphData.edges.length,
      nodeCount: graphData.nodes.length,
    });
  }
  handlers.sendGraphIndexStatusUpdated(actualHasIndex, status.freshness, status.detail);
  state.analyzer?.registry.notifyPostAnalyze(graphData, state.disabledPlugins);
  handlers.markWorkspaceReady(graphData, state.disabledPlugins);
}

export function publishAnalysisFailure(
  handlers: GraphViewAnalysisExecutionHandlers,
): void {
  const graphData = publishEmptyGraph(handlers);
  handlers.sendPluginStatuses();
  handlers.sendPluginExporters?.();
  handlers.sendPluginToolbarActions?.();
  handlers.sendGraphViewContributionStatuses?.();
  handlers.sendPluginWebviewInjections?.();
  handlers.markWorkspaceReady(graphData);
}
