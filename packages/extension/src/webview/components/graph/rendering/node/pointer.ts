import { drawShape } from '../shapes/draw/twoDimensional';
import type { FGNode } from '../../model/build';

function isFinitePositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function paintRectangularPointerArea(
  node: FGNode,
  ctx: CanvasRenderingContext2D,
): boolean {
  const area = node.pointerArea2D;
  if (!isFinitePositiveNumber(area?.height) || !isFinitePositiveNumber(area.width)) {
    return false;
  }

  ctx.fillRect(
    node.x! - (area.width / 2),
    node.y! - (area.height / 2),
    area.width,
    area.height,
  );
  return true;
}

export function paintNodePointerArea(
  node: FGNode,
  color: string,
  ctx: CanvasRenderingContext2D,
): void {
  ctx.fillStyle = color;
  if (paintRectangularPointerArea(node, ctx)) {
    return;
  }

  drawShape(ctx, node.shape2D ?? 'circle', node.x!, node.y!, node.size + 2);
  ctx.fill();
}
