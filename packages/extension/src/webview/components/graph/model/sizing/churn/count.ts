import type { IGraphNode } from '../../../../../../shared/graph/contracts';
import { MIN_NODE_SIZE, MAX_NODE_SIZE } from '../calculations';
import { getMetricRange, scaleMetricValue } from '../range';

export function computeChurnSizes(nodes: IGraphNode[]): Map<string, number> {
  const sizes = new Map<string, number>();
  const values = nodes.map(node => node.churn ?? 0);
  const { min, range } = getMetricRange(values, 0, 1);

  for (const node of nodes) {
    const churn = node.churn ?? 0;
    sizes.set(node.id, scaleMetricValue(churn, min, range, MIN_NODE_SIZE, MAX_NODE_SIZE));
  }

  return sizes;
}
