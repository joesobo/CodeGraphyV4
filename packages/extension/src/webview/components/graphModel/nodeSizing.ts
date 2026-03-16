import type { IGraphEdge, IGraphNode, NodeSizeMode } from '../../../shared/types';
import { DEFAULT_NODE_SIZE } from './nodeDisplay';

const MIN_NODE_SIZE = 10;
const MAX_NODE_SIZE = 40;

/** Map normalized repelForce (0-20) to d3 forceManyBody strength (0 to -500) */
export function toD3Repel(repelForce: number): number {
  return -(repelForce / 20) * 500;
}

export function calculateNodeSizes(
  nodes: IGraphNode[],
  edges: Pick<IGraphEdge, 'from' | 'to'>[],
  mode: NodeSizeMode
): Map<string, number> {
  const sizes = new Map<string, number>();

  if (mode === 'uniform') {
    for (const node of nodes) sizes.set(node.id, DEFAULT_NODE_SIZE);
    return sizes;
  }

  if (mode === 'connections') {
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

  if (mode === 'access-count') {
    const values = nodes.map(node => node.accessCount ?? 0);
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 1);
    const range = max - min || 1;

    for (const node of nodes) {
      const accessCount = node.accessCount ?? 0;
      sizes.set(
        node.id,
        MIN_NODE_SIZE + ((accessCount - min) / range) * (MAX_NODE_SIZE - MIN_NODE_SIZE)
      );
    }

    return sizes;
  }

  if (mode === 'file-size') {
    const fileSizes = nodes.map(node => node.fileSize ?? 0).filter(size => size > 0);
    if (fileSizes.length === 0) {
      for (const node of nodes) sizes.set(node.id, DEFAULT_NODE_SIZE);
      return sizes;
    }

    const logSizes = fileSizes.map(size => Math.log10(size + 1));
    const minLog = Math.min(...logSizes);
    const maxLog = Math.max(...logSizes);
    const range = maxLog - minLog || 1;

    for (const node of nodes) {
      const fileSize = node.fileSize ?? 0;
      if (fileSize === 0) {
        sizes.set(node.id, MIN_NODE_SIZE);
        continue;
      }

      const logSize = Math.log10(fileSize + 1);
      sizes.set(
        node.id,
        MIN_NODE_SIZE + ((logSize - minLog) / range) * (MAX_NODE_SIZE - MIN_NODE_SIZE)
      );
    }

    return sizes;
  }

  for (const node of nodes) sizes.set(node.id, DEFAULT_NODE_SIZE);
  return sizes;
}
