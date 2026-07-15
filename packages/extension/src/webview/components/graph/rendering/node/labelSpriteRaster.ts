import type { NodeLabelSprite } from './labelSprite';

const FONT = '12px Sans-Serif';
const PADDING = 2;

export function rasterizeNodeLabelSprite(createCanvas: () => HTMLCanvasElement, text: string, color: string, scale: number): { backingBytes: number; sprite: NodeLabelSprite } {
  const canvas = createCanvas();
  const measurement = canvas.getContext('2d');
  if (!measurement) throw new Error('Canvas 2D is unavailable for graph labels');
  measurement.font = FONT;
  const metrics = measurement.measureText(text);
  const left = Number.isFinite(metrics.actualBoundingBoxLeft) ? metrics.actualBoundingBoxLeft : 0;
  const right = Number.isFinite(metrics.actualBoundingBoxRight) ? metrics.actualBoundingBoxRight : metrics.width;
  const ascent = Number.isFinite(metrics.actualBoundingBoxAscent) ? metrics.actualBoundingBoxAscent : 11;
  const descent = Number.isFinite(metrics.actualBoundingBoxDescent) ? metrics.actualBoundingBoxDescent : 2;
  const cssWidth = Math.ceil(Math.max(metrics.width, left + right)) + PADDING;
  const cssHeight = Math.ceil(ascent + descent) + PADDING;
  canvas.width = Math.max(1, Math.ceil(cssWidth * scale));
  canvas.height = Math.max(1, Math.ceil(cssHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D is unavailable for graph labels');
  context.scale(scale, scale); context.fillStyle = color; context.font = FONT;
  context.textAlign = 'left'; context.textBaseline = 'alphabetic';
  context.fillText(text, PADDING / 2 + left, PADDING / 2 + ascent);
  return { backingBytes: canvas.width * canvas.height * 4, sprite: { cssHeight, cssWidth, image: canvas } };
}
