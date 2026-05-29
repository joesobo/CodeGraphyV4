import type { IGraphData } from '../../../../shared/graph/contracts';

export function countTooltipEdges(
  nodeId: string,
  snapshot: Pick<IGraphData, 'edges'>,
): { incomingCount: number; outgoingCount: number } {
  let incomingCount = 0;
  let outgoingCount = 0;
  for (const edge of snapshot.edges) {
    if (edge.from === nodeId) {
      outgoingCount++;
    }
    if (edge.to === nodeId) {
      incomingCount++;
    }
  }
  return { incomingCount, outgoingCount };
}
