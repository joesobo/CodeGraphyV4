import type { FGNode } from '../../../../../model/build';
import { OWNED_GRAPH_COLLISION_RADIUS_PADDING } from '@codegraphy-dev/graph-visuals';

type CollisionNode = Pick<FGNode, 'collisionRadius2D' | 'shapeSize2D' | 'size'>;

export function ownedNodeCollisionRadius(node: CollisionNode): number {
  const padding = OWNED_GRAPH_COLLISION_RADIUS_PADDING;
  if (Number.isFinite(node.collisionRadius2D)) {
    return Math.max(0, node.collisionRadius2D as number) + padding;
  }
  if (node.shapeSize2D) {
    return Math.max(1, Math.hypot(node.shapeSize2D.width, node.shapeSize2D.height) / 2) + padding;
  }
  return Math.max(0, node.size ?? 4) + padding;
}
