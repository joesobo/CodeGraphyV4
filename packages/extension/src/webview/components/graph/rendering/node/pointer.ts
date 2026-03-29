import { drawShape } from '../shapes/draw2d';
import type { FGNode } from '../../model/build';

export function paintNodePointerArea(
  node: FGNode,
  color: string,
  ctx: CanvasRenderingContext2D,
): void {
  ctx.fillStyle = color;
  drawShape(ctx, node.shape2D ?? 'circle', node.x!, node.y!, node.size + 2);
  ctx.fill();
}
