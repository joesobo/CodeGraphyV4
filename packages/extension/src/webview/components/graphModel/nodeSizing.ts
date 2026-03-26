import type { IGraphEdge, IGraphNode, NodeSizeMode } from '../../../shared/contracts';
import {
  computeConnectionSizes,
  computeAccessCountSizes,
  computeFileSizeSizes,
} from './sizingModes';
import { DEFAULT_NODE_SIZE } from './nodeDisplay';

/** Map normalized repelForce (0-20) to d3 forceManyBody strength (0 to -500) */
export function toD3Repel(repelForce: number): number {
  return -(repelForce / 20) * 500;
}

export function calculateNodeSizes(
  nodes: IGraphNode[],
  edges: Pick<IGraphEdge, 'from' | 'to'>[],
  mode: NodeSizeMode
): Map<string, number> {
  if (mode === 'connections') return computeConnectionSizes(nodes, edges);
  if (mode === 'access-count') return computeAccessCountSizes(nodes);
  if (mode === 'file-size') return computeFileSizeSizes(nodes);

  // 'uniform' and any unrecognized mode both use the default node size
  const sizes = new Map<string, number>();
  for (const node of nodes) sizes.set(node.id, DEFAULT_NODE_SIZE);
  return sizes;
}
