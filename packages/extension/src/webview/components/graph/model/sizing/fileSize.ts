import type { IGraphNode } from '../../../../../shared/graph/contracts';
import { MIN_NODE_SIZE, MAX_NODE_SIZE } from './calculations';
import { scaleMetricValue } from './range';

export function computeFileSizeSizes(nodes: IGraphNode[]): Map<string, number> {
  const sizes = new Map<string, number>();
  const fileSizes = nodes.map(node => node.fileSize ?? 0).filter(size => size > 0);
  const logSizes = fileSizes.map(size => Math.log1p(size));
  const minimumLogSize = Math.min(...logSizes);
  const maximumLogSize = Math.max(...logSizes);
  const range = maximumLogSize - minimumLogSize;
  if (fileSizes.length === 0 || range === 0) {
    for (const node of nodes) sizes.set(node.id, MIN_NODE_SIZE);
    return sizes;
  }

  for (const node of nodes) {
    const fileSize = node.fileSize ?? 0;
    const size = fileSize > 0
      ? scaleMetricValue(
          Math.log1p(fileSize),
          minimumLogSize,
          range,
          MIN_NODE_SIZE,
          MAX_NODE_SIZE,
        )
      : MIN_NODE_SIZE;
    sizes.set(node.id, size);
  }

  return sizes;
}
