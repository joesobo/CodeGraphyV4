import type { IGraphNode } from '../../../../../shared/graph/types';
import { DEFAULT_NODE_SIZE } from '../node/display';
import { MIN_NODE_SIZE, MAX_NODE_SIZE } from './calculations';

/** Returns sizes scaled by each node's recorded access count. */
export function computeAccessCountSizes(nodes: IGraphNode[]): Map<string, number> {
  const sizes = new Map<string, number>();
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

/** Returns sizes scaled logarithmically by each node's file size in bytes. */
export function computeFileSizeSizes(nodes: IGraphNode[]): Map<string, number> {
  const sizes = new Map<string, number>();
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
