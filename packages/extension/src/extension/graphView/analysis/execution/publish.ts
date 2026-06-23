import type { IGraphData, IGraphNode } from '../../../../shared/graph/contracts';
import type {
  GraphViewAnalysisExecutionHandlers,
  GraphViewAnalysisExecutionState,
} from '../execution';
import type { IGraphNodeMetricsUpdate } from '../../../../shared/protocol/extensionToWebview';
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
      : 'CodeGraphy index is missing. Index the workspace to build the graph.',
  };
}

function shouldReportGraphViewUpdateProgress(
  state: GraphViewAnalysisExecutionState,
): boolean {
  return state.mode === 'index' || state.mode === 'refresh' || state.mode === 'incremental';
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

function areGraphGroupSymbolInputsEqual(
  left: IGraphNode['symbol'],
  right: IGraphNode['symbol'],
): boolean {
  if (left === right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  return left.kind === right.kind
    && left.pluginKind === right.pluginKind
    && left.source === right.source
    && left.language === right.language
    && left.filePath === right.filePath;
}

function areGraphGroupNodeInputsEqual(left: IGraphNode, right: IGraphNode): boolean {
  return left.id === right.id
    && left.nodeType === right.nodeType
    && areGraphGroupSymbolInputsEqual(left.symbol, right.symbol);
}

function doGraphViewGroupsNeedRecompute(
  currentRawGraphData: IGraphData,
  nextRawGraphData: IGraphData,
): boolean {
  if (currentRawGraphData.nodes.length !== nextRawGraphData.nodes.length) {
    return true;
  }

  const nextNodesById = new Map(nextRawGraphData.nodes.map(node => [node.id, node]));
  for (const currentNode of currentRawGraphData.nodes) {
    const nextNode = nextNodesById.get(currentNode.id);
    if (!nextNode || !areGraphGroupNodeInputsEqual(currentNode, nextNode)) {
      return true;
    }
  }

  return false;
}

function normalizeGraphPath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

function isGraphNodeForChangedPath(nodeId: string, changedFilePath: string): boolean {
  const normalizedNodeId = normalizeGraphPath(nodeId);
  const normalizedChangedFilePath = normalizeGraphPath(changedFilePath);
  return normalizedChangedFilePath === normalizedNodeId
    || normalizedChangedFilePath.endsWith(`/${normalizedNodeId}`);
}

function isGraphNodeAffectedByChangedPath(node: IGraphNode, changedFilePath: string): boolean {
  const symbolFilePath = node.symbol?.filePath;
  return isGraphNodeForChangedPath(node.id, changedFilePath)
    || (symbolFilePath ? isGraphNodeForChangedPath(symbolFilePath, changedFilePath) : false);
}

function findGraphNodeByChangedPath(
  graphData: IGraphData,
  changedFilePath: string,
): IGraphNode | undefined {
  return graphData.nodes.find(node => isGraphNodeForChangedPath(node.id, changedFilePath));
}

function hasChangedNodeMetricDifference(
  currentRawGraphData: IGraphData,
  nextRawGraphData: IGraphData,
  changedFilePaths: readonly string[] | undefined,
): boolean {
  if (!changedFilePaths?.length) {
    return false;
  }

  for (const changedFilePath of changedFilePaths) {
    const currentNode = findGraphNodeByChangedPath(currentRawGraphData, changedFilePath);
    const nextNode = findGraphNodeByChangedPath(nextRawGraphData, changedFilePath);
    if (!currentNode || !nextNode) {
      continue;
    }

    if (
      currentNode.fileSize !== nextNode.fileSize
      || currentNode.churn !== nextNode.churn
    ) {
      return true;
    }
  }

  return false;
}

function collectChangedPathNodes(
  graphData: IGraphData,
  changedFilePaths: readonly string[],
): IGraphNode[] {
  return graphData.nodes.filter(node =>
    changedFilePaths.some(changedFilePath =>
      isGraphNodeAffectedByChangedPath(node, changedFilePath),
    ),
  );
}

function createNodeMap(nodes: readonly IGraphNode[]): Map<string, IGraphNode> {
  return new Map(nodes.map(node => [node.id, node]));
}

function areGraphValuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
      return false;
    }

    return left.every((leftValue, index) => areGraphValuesEqual(leftValue, right[index]));
  }

  if (
    left === null
    || right === null
    || typeof left !== 'object'
    || typeof right !== 'object'
  ) {
    return false;
  }

  const leftRecord = left as unknown as Record<string, unknown>;
  const rightRecord = right as unknown as Record<string, unknown>;
  const keys = new Set([...Object.keys(leftRecord), ...Object.keys(rightRecord)]);
  for (const key of keys) {
    if (!areGraphValuesEqual(leftRecord[key], rightRecord[key])) {
      return false;
    }
  }

  return true;
}

function areNodesEqualIgnoringMetrics(left: IGraphNode, right: IGraphNode): boolean {
  if (left === right) {
    return true;
  }

  const leftRecord = left as unknown as Record<string, unknown>;
  const rightRecord = right as unknown as Record<string, unknown>;
  const keys = new Set([...Object.keys(leftRecord), ...Object.keys(rightRecord)]);
  keys.delete('churn');
  keys.delete('fileSize');

  for (const key of keys) {
    if (!areGraphValuesEqual(leftRecord[key], rightRecord[key])) {
      return false;
    }
  }

  return true;
}

function areGraphDataEqualIgnoringNodeMetrics(
  currentRawGraphData: IGraphData,
  nextRawGraphData: IGraphData,
): boolean {
  if (
    currentRawGraphData.nodes.length !== nextRawGraphData.nodes.length
    || currentRawGraphData.edges.length !== nextRawGraphData.edges.length
  ) {
    return false;
  }

  for (let index = 0; index < currentRawGraphData.nodes.length; index += 1) {
    if (!areNodesEqualIgnoringMetrics(
      currentRawGraphData.nodes[index],
      nextRawGraphData.nodes[index],
    )) {
      return false;
    }
  }

  for (let index = 0; index < currentRawGraphData.edges.length; index += 1) {
    if (!areGraphValuesEqual(
      currentRawGraphData.edges[index],
      nextRawGraphData.edges[index],
    )) {
      return false;
    }
  }

  return true;
}

function createMetricOnlyGraphUpdate(
  currentRawGraphData: IGraphData | undefined,
  nextRawGraphData: IGraphData,
  changedFilePaths: readonly string[] | undefined,
): IGraphNodeMetricsUpdate[] | undefined {
  if (
    !currentRawGraphData
    || !changedFilePaths?.length
    || currentRawGraphData.nodes.length !== nextRawGraphData.nodes.length
    || currentRawGraphData.edges.length !== nextRawGraphData.edges.length
  ) {
    return undefined;
  }

  if (!areGraphDataEqualIgnoringNodeMetrics(currentRawGraphData, nextRawGraphData)) {
    return undefined;
  }

  const currentNodes = collectChangedPathNodes(currentRawGraphData, changedFilePaths);
  const nextNodes = collectChangedPathNodes(nextRawGraphData, changedFilePaths);
  if (currentNodes.length === 0 || currentNodes.length !== nextNodes.length) {
    return undefined;
  }

  const nextNodesById = createNodeMap(nextNodes);
  const updates: IGraphNodeMetricsUpdate[] = [];

  for (const currentNode of currentNodes) {
    const nextNode = nextNodesById.get(currentNode.id);
    if (!nextNode || !areNodesEqualIgnoringMetrics(currentNode, nextNode)) {
      return undefined;
    }

    if (
      currentNode.fileSize !== nextNode.fileSize
      || currentNode.churn !== nextNode.churn
    ) {
      updates.push({
        id: nextNode.id,
        fileSize: nextNode.fileSize,
        churn: nextNode.churn,
      });
    }
  }

  if (updates.length === 0) {
    return undefined;
  }

  return updates;
}

function canReuseCurrentGraphPublication(
  state: GraphViewAnalysisExecutionState,
  currentRawGraphData: IGraphData | undefined,
  rawGraphData: IGraphData,
  actualHasIndex: boolean,
  freshness: CodeGraphyIndexFreshness,
): boolean {
  if (state.mode !== 'incremental' || !actualHasIndex || freshness !== 'fresh') {
    return false;
  }

  return currentRawGraphData
    ? !hasChangedNodeMetricDifference(currentRawGraphData, rawGraphData, state.changedFilePaths)
      && areGraphDataPayloadsEqual(currentRawGraphData, rawGraphData)
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

  const currentRawGraphData = handlers.getRawGraphData?.();
  const metricOnlyUpdate = createMetricOnlyGraphUpdate(
    currentRawGraphData,
    rawGraphData,
    state.changedFilePaths,
  );
  const shouldSendMetricPatch = metricOnlyUpdate !== undefined
    && handlers.sendGraphNodeMetricsUpdated !== undefined;
  const reuseCurrentGraphPublication = canReuseCurrentGraphPublication(
    state,
    currentRawGraphData,
    rawGraphData,
    actualHasIndex,
    status.freshness,
  );

  if (!reuseCurrentGraphPublication) {
    handlers.setRawGraphData(rawGraphData);

    handlers.updateViewContext();
    handlers.applyViewTransform();

    const canSkipGroupPublication = state.mode === 'incremental'
      && currentRawGraphData
      && !doGraphViewGroupsNeedRecompute(currentRawGraphData, rawGraphData);
    if (!canSkipGroupPublication) {
      handlers.computeMergedGroups();

      handlers.sendGroupsUpdated();
    }
  }

  if (!shouldSendMetricPatch) {
    handlers.sendDepthState();
    handlers.sendPluginStatuses();
    handlers.sendDecorations();
    handlers.sendContextMenuItems();
    handlers.sendPluginExporters?.();
    handlers.sendPluginToolbarActions?.();
    handlers.sendGraphViewContributionStatuses?.();
    handlers.sendPluginWebviewInjections?.();
  }

  const graphData = handlers.getGraphData();
  if (!reuseCurrentGraphPublication) {
    if (shouldSendMetricPatch) {
      handlers.sendGraphNodeMetricsUpdated?.(metricOnlyUpdate);
    } else {
      handlers.sendGraphDataUpdated(graphData);
    }
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
