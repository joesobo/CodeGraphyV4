import type { IGraphEdge, IGraphNode } from '../../../shared/contracts';
import { DEFAULT_NODE_SIZE } from './nodeDisplay';

export const MIN_NODE_SIZE = 10;
export const MAX_NODE_SIZE = 40;

/** Returns sizes where every node has the default uniform size. */
export function computeUniformSizes(nodes: IGraphNode[]): Map<string, number> {
  const sizes = new Map<string, number>();
  for (const node of nodes) sizes.set(node.id, DEFAULT_NODE_SIZE);
  return sizes;
}

/** Returns sizes scaled by the number of edges each node participates in. */
export function computeConnectionSizes(
  nodes: IGraphNode[],
  edges: Pick<IGraphEdge, 'from' | 'to'>[]
): Map<string, number> {
  const sizes = new Map<string, number>();
  const counts = new Map<string, number>();
  for (const node of nodes) counts.set(node.id, 0);
  for (const edge of edges) {
    counts.set(edge.from, (counts.get(edge.from) ?? 0) + 1);
    counts.set(edge.to, (counts.get(edge.to) ?? 0) + 1);
  }

  const values = Array.from(counts.values());
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const range = max - min || 1;

  for (const node of nodes) {
    const count = counts.get(node.id) ?? 0;
    sizes.set(node.id, MIN_NODE_SIZE + ((count - min) / range) * (MAX_NODE_SIZE - MIN_NODE_SIZE));
  }

  return sizes;
}
