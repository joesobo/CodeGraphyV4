import type { IGraphNode } from '../../../../../shared/graph/contracts';
import { DEFAULT_NODE_SIZE } from '../node/display';
import { MIN_NODE_SIZE, MAX_NODE_SIZE } from './calculations';
import { getMetricRange, scaleMetricValue } from './range';

export function computeFileSizeSizes(nodes: IGraphNode[]): Map<string, number> {
  const sizes = new Map<string, number>();
  const fileSizes = nodes.map(node => node.fileSize ?? 0).filter(size => size > 0);
  if (fileSizes.length === 0) {
    for (const node of nodes) sizes.set(node.id, DEFAULT_NODE_SIZE);
    return sizes;
  }

  const logSizes = fileSizes.map(size => Math.log10(size + 1));
  const { min: minLog, range } = getMetricRange(
    logSizes,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  );

  for (const node of nodes) {
    const fileSize = node.fileSize ?? 0;
    if (fileSize === 0) {
      sizes.set(node.id, MIN_NODE_SIZE);
      continue;
    }

    const logSize = Math.log10(fileSize + 1);
    sizes.set(node.id, scaleMetricValue(logSize, minLog, range, MIN_NODE_SIZE, MAX_NODE_SIZE));
  }

  return sizes;
}
