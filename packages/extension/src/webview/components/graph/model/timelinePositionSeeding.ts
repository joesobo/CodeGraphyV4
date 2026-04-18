import type { IGraphEdge } from '../../../../shared/graph/contracts';
import type { FGNode } from './build';
import { resolveTimelineSeedNeighbor } from './timelinePositionSeedNeighbor';

type PreviousTimelinePosition = { x: number | undefined; y: number | undefined };

function seedNodePosition(
  node: FGNode,
  neighborX: number,
  neighborY: number,
  random: () => number,
): void {
  node.x = neighborX + (random() - 0.5) * 40;
  node.y = neighborY + (random() - 0.5) * 40;
}

export function seedTimelinePositions(
  nodes: FGNode[],
  edges: IGraphEdge[],
  previousPositions: Map<string, PreviousTimelinePosition> | null,
  random: () => number
): void {
  if (!previousPositions || previousPositions.size === 0) return;

  const nodePositionMap = new Map(nodes.map((node) => [node.id, node]));

  for (const node of nodes) {
    const neighbor = resolveTimelineSeedNeighbor(node, edges, nodePositionMap);
    if (neighbor?.x === undefined || neighbor.y === undefined) continue;

    seedNodePosition(node, neighbor.x, neighbor.y, random);
  }
}
