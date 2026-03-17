/**
 * @fileoverview Regular polygon shape drawing functions for the 2D canvas graph.
 * @module webview/components/graph/rendering/regularPolygons
 */

/**
 * Draw a triangle path on a canvas context.
 *
 * Calls `beginPath()` and defines the geometry. The caller is responsible
 * for calling `fill()` and/or `stroke()` afterwards.
 */
export function drawTriangle(
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

/**
 * Draw a hexagon path on a canvas context.
 *
 * Calls `beginPath()` and defines the geometry. The caller is responsible
 * for calling `fill()` and/or `stroke()` afterwards.
 */
export function drawHexagon(
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
