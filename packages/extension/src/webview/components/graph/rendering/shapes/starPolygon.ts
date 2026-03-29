/**
 * @fileoverview Star polygon shape drawing function for the 2D canvas graph.
 * @module webview/components/graph/rendering/shapes/starPolygon
 */

/**
 * Draw a star path on a canvas context.
 *
 * Calls `beginPath()` and defines the geometry. The caller is responsible
 * for calling `fill()` and/or `stroke()` afterwards.
 */
export function drawStar(
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
