import type { FGNode } from '../../../../../model/build';

export interface OwnedGraphBounds { maximumX: number; maximumY: number; minimumX: number; minimumY: number }

function nodeHalfExtent(extent: number | undefined, size: number | undefined): number {
  return Math.max(1, extent ? extent / 2 : size ?? 4);
}

export function ownedGraphBounds(nodes: readonly FGNode[]): OwnedGraphBounds | null {
  const bounds = { maximumX: -Infinity, maximumY: -Infinity, minimumX: Infinity, minimumY: Infinity };
  let count = 0;
  for (const node of nodes) {
    if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) continue;
    const halfWidth = nodeHalfExtent(node.shapeSize2D?.width, node.size);
    const halfHeight = nodeHalfExtent(node.shapeSize2D?.height, node.size);
    bounds.minimumX = Math.min(bounds.minimumX, (node.x as number) - halfWidth);
    bounds.minimumY = Math.min(bounds.minimumY, (node.y as number) - halfHeight);
    bounds.maximumX = Math.max(bounds.maximumX, (node.x as number) + halfWidth);
    bounds.maximumY = Math.max(bounds.maximumY, (node.y as number) + halfHeight);
    count += 1;
  }
  return count > 0 ? bounds : null;
}
