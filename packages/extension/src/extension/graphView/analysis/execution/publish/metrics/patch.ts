import type { IGraphData } from '../../../../../../shared/graph/contracts';
import type { IGraphNodeMetricsUpdate } from '../../../../../../shared/protocol/extensionToWebview';
import { collectChangedPathNodes } from './changedPaths';
import {
  collectMetricOnlyGraphUpdates,
  createNodeMap,
} from './updates';
import { areGraphDataEqualIgnoringNodeMetrics } from '../equality/data';

export function createMetricOnlyGraphUpdate(
  currentRawGraphData: IGraphData | undefined,
  nextRawGraphData: IGraphData,
  changedFilePaths: readonly string[] | undefined,
): IGraphNodeMetricsUpdate[] | undefined {
  if (!currentRawGraphData || !changedFilePaths?.length) {
    return undefined;
  }

  if (!areGraphDataEqualIgnoringNodeMetrics(currentRawGraphData, nextRawGraphData)) {
    return undefined;
  }

  const currentNodes = collectChangedPathNodes(currentRawGraphData, changedFilePaths);
  const nextNodes = collectChangedPathNodes(nextRawGraphData, changedFilePaths);
  return collectMetricOnlyGraphUpdates(currentNodes, createNodeMap(nextNodes));
}
