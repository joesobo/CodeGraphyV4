import { drawTriangle, drawHexagon } from '../regularPolygons';
import type { NodeShape2D } from '../../../../../../shared/settings/modes';
import { drawStar } from '../starPolygon';
import type { RectangularNodeArea2D } from '../../../model/node/rectangularArea';

export { drawTriangle, drawHexagon } from '../regularPolygons';
export { drawStar } from '../starPolygon';

/**
 * Draw a 2D shape path on a canvas context.
 *
 * Calls `beginPath()` and defines the geometry. The caller is responsible
 * for calling `fill()` and/or `stroke()` afterwards.
 */
export function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: NodeShape2D,
  x: number,
  y: number,
  size: number,
  shapeSize?: RectangularNodeArea2D,
  cornerRadius = 0,
): void {
  switch (shape) {
    case 'circle':
      drawCircle(ctx, x, y, size);
      break;
    case 'square':
      drawSquare(ctx, x, y, size);
      break;
    case 'rectangle':
      drawRectangle(ctx, x, y, size, shapeSize, cornerRadius);
      break;
    case 'diamond':
      drawDiamond(ctx, x, y, size);
      break;
    case 'triangle':
      drawTriangle(ctx, x, y, size);
      break;
    case 'hexagon':
      drawHexagon(ctx, x, y, size);
      break;
    case 'star':
      drawStar(ctx, x, y, size);
      break;
  }
}

function drawCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
): void {
  ctx.beginPath();
  ctx.arc(x, y, size, 0, 2 * Math.PI, false);
}

function drawSquare(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
): void {
  ctx.beginPath();
  ctx.rect(x - size, y - size, size * 2, size * 2);
  ctx.closePath();
}

function drawRectangle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  shapeSize: RectangularNodeArea2D | undefined,
  cornerRadius: number,
): void {
  const width = shapeSize?.width ?? size * 2;
  const height = shapeSize?.height ?? size * 2;
  const radius = Math.max(0, Math.min(cornerRadius, width / 2, height / 2));
  const left = x - (width / 2);
  const top = y - (height / 2);
  const right = left + width;
  const bottom = top + height;

  ctx.beginPath();
  if (radius === 0) {
    ctx.rect(left, top, width, height);
    ctx.closePath();
    return;
  }

  ctx.moveTo(left + radius, top);
  ctx.lineTo(right - radius, top);
  ctx.quadraticCurveTo(right, top, right, top + radius);
  ctx.lineTo(right, bottom - radius);
  ctx.quadraticCurveTo(right, bottom, right - radius, bottom);
  ctx.lineTo(left + radius, bottom);
  ctx.quadraticCurveTo(left, bottom, left, bottom - radius);
  ctx.lineTo(left, top + radius);
  ctx.quadraticCurveTo(left, top, left + radius, top);
  ctx.closePath();
}

function drawDiamond(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size, y);
  ctx.lineTo(x, y + size);
  ctx.lineTo(x - size, y);
  ctx.closePath();
}
