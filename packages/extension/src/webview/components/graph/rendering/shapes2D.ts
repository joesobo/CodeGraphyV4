import type { NodeShape2D } from '../../../../shared/contracts';
import { drawTriangle, drawHexagon, drawStar } from './shapes2DPolygons';

export { drawTriangle, drawHexagon, drawStar } from './shapes2DPolygons';

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
): void {
  switch (shape) {
    case 'circle':
      drawCircle(ctx, x, y, size);
      break;
    case 'square':
      drawSquare(ctx, x, y, size);
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
