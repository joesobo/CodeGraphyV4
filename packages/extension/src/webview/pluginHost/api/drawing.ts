/**
 * @fileoverview Static canvas drawing helpers for Tier-2 plugin renderers.
 * Pure functions — no class state, no side effects beyond writing to the canvas.
 * @module webview/pluginHost/drawing
 */

import { resolveCssColor } from '../../cssColors/resolver';
import type { BadgeOpts, RingOpts, LabelOpts } from './contracts/webview';

function graphColorContext(ctx: CanvasRenderingContext2D): Element | null {
  return ctx.canvas?.parentElement ?? null;
}

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

  ctx.fillStyle = resolveCssColor(opts.bgColor, '#EF4444', graphColorContext(ctx));
  ctx.beginPath();
  ctx.roundRect(opts.x - width / 2, opts.y - height / 2, width, height, height / 2);
  ctx.fill();

  ctx.fillStyle = resolveCssColor(opts.color, '#FFFFFF', graphColorContext(ctx));
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

  ctx.strokeStyle = resolveCssColor(opts.color, '#FFFFFF', graphColorContext(ctx));
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
  ctx.fillStyle = resolveCssColor(opts.color, '#FFFFFF', graphColorContext(ctx));
  ctx.textAlign = opts.align ?? 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(opts.text, opts.x, opts.y);
}
