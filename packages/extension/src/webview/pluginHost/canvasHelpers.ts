/**
 * @fileoverview Static canvas drawing helpers for plugin node decorations.
 */

import type { BadgeOpts, RingOpts, LabelOpts } from './types';

/**
 * Draw a pill-shaped badge with text on a canvas.
 */
export function drawBadge(ctx: CanvasRenderingContext2D, opts: BadgeOpts): void {
  const fontSize = opts.fontSize ?? 8;
  ctx.font = `bold ${fontSize}px sans-serif`;
  const metrics = ctx.measureText(opts.text);
  const padding = 3;
  const w = metrics.width + padding * 2;
  const h = fontSize + padding * 2;

  ctx.fillStyle = opts.bgColor ?? '#EF4444';
  ctx.beginPath();
  ctx.roundRect(opts.x - w / 2, opts.y - h / 2, w, h, h / 2);
  ctx.fill();

  ctx.fillStyle = opts.color ?? '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(opts.text, opts.x, opts.y);
}

/**
 * Draw a partial-circle progress ring on a canvas.
 */
export function drawProgressRing(ctx: CanvasRenderingContext2D, opts: RingOpts): void {
  const width = opts.width ?? 2;
  const progress = opts.progress ?? 1;

  ctx.strokeStyle = opts.color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.arc(opts.x, opts.y, opts.radius, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * progress);
  ctx.stroke();
}

/**
 * Draw a text label on a canvas.
 */
export function drawLabel(ctx: CanvasRenderingContext2D, opts: LabelOpts): void {
  const fontSize = opts.fontSize ?? 10;
  ctx.font = `${fontSize}px sans-serif`;
  ctx.fillStyle = opts.color ?? '#FFFFFF';
  ctx.textAlign = opts.align ?? 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(opts.text, opts.x, opts.y);
}
