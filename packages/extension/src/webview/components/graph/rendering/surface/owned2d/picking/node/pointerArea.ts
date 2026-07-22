import type { FGNode } from '../../../../../model/build';
import { getRectangularNodeArea2D, getRectangularNodeAreaRadius } from '../../../../../model/node/rectangularArea';

export function ownedNodePointerArea(node: FGNode) {
  return getRectangularNodeArea2D(node.pointerArea2D) ?? getRectangularNodeArea2D(node.shapeSize2D);
}

export function ownedNodePointerRadius(node: FGNode): number {
  const area = ownedNodePointerArea(node);
  return area ? getRectangularNodeAreaRadius(area) : 0;
}
