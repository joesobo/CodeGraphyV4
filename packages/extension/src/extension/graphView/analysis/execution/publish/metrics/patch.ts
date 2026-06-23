import type { IGraphData } from '../../../../../../shared/graph/contracts';
import type { IGraphNodeMetricsUpdate } from '../../../../../../shared/protocol/extensionToWebview';
import { collectChangedPathNodes } from './changedPaths';
import {
  collectMetricOnlyGraphUpdates,
  createNodeMap,
} from './updates';
import { areGraphDataEqualIgnoringNodeMetrics } from '../equality/graph';

function canConsiderMetricOnlyGraphUpdate(
  currentRawGraphData: IGraphData | undefined,
  nextRawGraphData: IGraphData,
  changedFilePaths: readonly string[] | undefined,
): currentRawGraphData is IGraphData {
  return Boolean(
    currentRawGraphData
    && changedFilePaths?.length
    && currentRawGraphData.nodes.length === nextRawGraphData.nodes.length
    && currentRawGraphData.edges.length === nextRawGraphData.edges.length,
  );
}

export function createMetricOnlyGraphUpdate(
  currentRawGraphData: IGraphData | undefined,
  nextRawGraphData: IGraphData,
  changedFilePaths: readonly string[] | undefined,
): IGraphNodeMetricsUpdate[] | undefined {
  const changedPaths = changedFilePaths ?? [];
  if (!canConsiderMetricOnlyGraphUpdate(currentRawGraphData, nextRawGraphData, changedFilePaths)) {
    return undefined;
  }

  if (!areGraphDataEqualIgnoringNodeMetrics(currentRawGraphData, nextRawGraphData)) {
    return undefined;
  }

  const currentNodes = collectChangedPathNodes(currentRawGraphData, changedPaths);
  const nextNodes = collectChangedPathNodes(nextRawGraphData, changedPaths);
  if (currentNodes.length === 0 || currentNodes.length !== nextNodes.length) {
    return undefined;
  }

  return collectMetricOnlyGraphUpdates(currentNodes, createNodeMap(nextNodes));
}
