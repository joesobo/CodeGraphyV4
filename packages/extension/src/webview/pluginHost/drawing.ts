/**
 * @fileoverview Static canvas drawing helpers for Tier-2 plugin renderers.
 * Pure functions — no class state, no side effects beyond writing to the canvas.
 * @module webview/pluginHost/drawing
 */

import type { BadgeOpts, RingOpts, LabelOpts } from './types';

/**
 * Draws a pill-shaped badge with centered text.
 */
export function drawBadge(ctx: CanvasRenderingContext2D, opts: BadgeOpts): void {
  const fontSize = opts.fontSize ?? 8;
  ctx.font = `bold ${fontSize}px sans-serif`;
  const metrics = ctx.measureText(opts.text);
  const padding = 3;
  const width = metrics.width + padding * 2;
  const height = fontSize + padding * 2;

  ctx.fillStyle = opts.bgColor ?? '#EF4444';
  ctx.beginPath();
  ctx.roundRect(opts.x - width / 2, opts.y - height / 2, width, height, height / 2);
  ctx.fill();

  ctx.fillStyle = opts.color ?? '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(opts.text, opts.x, opts.y);
}

/**
 * Draws an arc representing progress (0–1).
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
 * Draws a text label centered on (x, y).
 */
export function drawLabel(ctx: CanvasRenderingContext2D, opts: LabelOpts): void {
  const fontSize = opts.fontSize ?? 10;
  ctx.font = `${fontSize}px sans-serif`;
  ctx.fillStyle = opts.color ?? '#FFFFFF';
  ctx.textAlign = opts.align ?? 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(opts.text, opts.x, opts.y);
}
