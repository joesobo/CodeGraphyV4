import { drawShape } from '../../../lib/shapes2D';
import type { FGNode } from '../../graphModel';

export function paintNodePointerArea(
  node: FGNode,
  color: string,
  ctx: CanvasRenderingContext2D,
): void {
  ctx.fillStyle = color;
  drawShape(ctx, node.shape2D ?? 'circle', node.x!, node.y!, node.size + 2);
  ctx.fill();
}
