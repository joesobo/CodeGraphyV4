import type { NodeShape2D } from '../../shared/types';

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

function drawTriangle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
): void {
  const angle = (2 * Math.PI) / 3;
  // Start from the top vertex (-PI/2 = straight up)
  const startAngle = -Math.PI / 2;

  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const theta = startAngle + i * angle;
    const px = x + size * Math.cos(theta);
    const py = y + size * Math.sin(theta);
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
}

function drawHexagon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
): void {
  const angle = (2 * Math.PI) / 6;
  // Start from the top vertex
  const startAngle = -Math.PI / 2;

  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const theta = startAngle + i * angle;
    const px = x + size * Math.cos(theta);
    const py = y + size * Math.sin(theta);
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
): void {
  const points = 5;
  const outerRadius = size;
  const innerRadius = size * 0.4;
  // Start from the top
  const startAngle = -Math.PI / 2;
  const step = Math.PI / points;

  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const theta = startAngle + i * step;
    const px = x + radius * Math.cos(theta);
    const py = y + radius * Math.sin(theta);
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
}
