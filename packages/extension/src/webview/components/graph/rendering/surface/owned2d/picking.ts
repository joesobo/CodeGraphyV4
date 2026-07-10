import type { FGNode } from '../../../model/build';

function pointerRadius(node: FGNode): number {
  const rectangularRadius = Math.max(
    node.pointerArea2D?.width ?? 0,
    node.pointerArea2D?.height ?? 0,
    node.shapeSize2D?.width ?? 0,
    node.shapeSize2D?.height ?? 0,
  ) / 2;
  return Math.max(2, rectangularRadius, node.collisionRadius2D ?? 0, node.size ?? 0);
}

export function pickOwnedGraphNode(
  nodes: readonly FGNode[],
  point: { x: number; y: number },
  globalScale: number,
): { index: number; node: FGNode } | undefined {
  let bestIndex = -1;
  let bestDistanceSquared = Number.POSITIVE_INFINITY;
  const minimumScreenRadius = 4 / Math.max(globalScale, 0.01);

  nodes.forEach((node, index) => {
    if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;
    const dx = point.x - (node.x as number);
    const dy = point.y - (node.y as number);
    const distanceSquared = dx * dx + dy * dy;
    const radius = Math.max(pointerRadius(node), minimumScreenRadius);
    if (distanceSquared <= radius * radius && distanceSquared < bestDistanceSquared) {
      bestIndex = index;
      bestDistanceSquared = distanceSquared;
    }
  });

  return bestIndex < 0 ? undefined : { index: bestIndex, node: nodes[bestIndex] };
}
