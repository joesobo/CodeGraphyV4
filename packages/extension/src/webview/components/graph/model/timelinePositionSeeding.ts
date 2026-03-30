import type { IGraphEdge } from '../../../../shared/graph/types';
import type { FGNode } from './build';

/**
 * For nodes that appear in the new timeline snapshot but have no recorded position,
 * seeds their position near a connected neighbor that does have a known position.
 * This prevents new nodes from spawning at the origin and snapping violently.
 */
export function seedTimelinePositions(
  nodes: FGNode[],
  edges: IGraphEdge[],
  previousPositions: Map<string, { x: number | undefined; y: number | undefined }> | null,
  random: () => number
): void {
  if (!previousPositions || previousPositions.size === 0) return;

  const nodePositionMap = new Map(nodes.map(node => [node.id, node]));

  for (const node of nodes) {
    if (node.x !== undefined || node.y !== undefined) continue;

    const edge = edges.find(candidate => candidate.from === node.id || candidate.to === node.id);
    if (!edge) continue;

    const neighborId = edge.from === node.id ? edge.to : edge.from;
    const neighbor = nodePositionMap.get(neighborId);
    if (neighbor?.x === undefined || neighbor?.y === undefined) continue;

    node.x = neighbor.x + (random() - 0.5) * 40;
    node.y = neighbor.y + (random() - 0.5) * 40;
  }
}
