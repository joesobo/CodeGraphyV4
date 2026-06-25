import type { IGraphData } from '../../../../../../shared/graph/contracts';

export function areGraphDataPayloadsEqual(left: IGraphData, right: IGraphData): boolean {
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
