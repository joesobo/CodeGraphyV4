import type { IGraphData } from '../../../../../../shared/graph/contracts';
import { areNodesEqualIgnoringMetrics } from './node';
import { areGraphValuesEqual } from './values';

export function areGraphDataEqualIgnoringNodeMetrics(
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
