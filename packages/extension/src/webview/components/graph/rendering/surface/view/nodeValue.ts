import type { FGNode } from '../../../model/build';
import { getRectangularNodeArea2D, getRectangularNodeAreaRadius } from '../../../model/node/rectangularArea';

function getPointerAreaRadius(node: FGNode): number | undefined {
  const area = getRectangularNodeArea2D(node.shapeSize2D)
    ?? getRectangularNodeArea2D(node.pointerArea2D);
  return area ? getRectangularNodeAreaRadius(area) : undefined;
}

export function getGraphNodeValue(node: FGNode): number {
  const radius = getPointerAreaRadius(node) ?? (node.size ?? 16);
  return Math.max(1, radius * radius);
}
