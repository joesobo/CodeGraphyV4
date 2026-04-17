import type { IGraphEdge } from '../../../../shared/graph/types';
import type { FGNode } from './build';
import {
  resolveSeedNeighbor,
  seedNodePosition,
} from './timelinePositionSeeding/seeding';

export function seedTimelinePositions(
  nodes: FGNode[],
  edges: IGraphEdge[],
  previousPositions: Map<string, { x: number | undefined; y: number | undefined }> | null,
  random: () => number
): void {
  if (!previousPositions || previousPositions.size === 0) return;

  const nodePositionMap = new Map(nodes.map((node) => [node.id, node]));

  for (const node of nodes) {
    const neighbor = resolveSeedNeighbor(node, edges, nodePositionMap);
    if (neighbor?.x === undefined || neighbor?.y === undefined) continue;

    seedNodePosition(node, neighbor.x, neighbor.y, random);
  }
}
