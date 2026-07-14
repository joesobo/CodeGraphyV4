import type { IGraphEdge, IGraphNode } from '../../../../../shared/graph/contracts';
import type { NodeSizeMode } from '../../../../../shared/settings/modes';
import { computeConnectionSizes } from '../sizing/calculations';
import { computeFileSizeSizes } from '../sizing/fileSize';

/** Map normalized repelForce (0-20) to d3 forceManyBody strength (0 to -500) */
export function toD3Repel(repelForce: number): number {
  return -(repelForce / 20) * 500;
}

export function calculateNodeSizes(
  nodes: IGraphNode[],
  edges: Pick<IGraphEdge, 'from' | 'to'>[],
  mode: NodeSizeMode
): Map<string, number> {
  return mode === 'connections'
    ? computeConnectionSizes(nodes, edges)
    : computeFileSizeSizes(nodes);
}
