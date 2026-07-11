import type { NodeDecorationPayload } from '../../../../../shared/plugins/decorations';
import type { GraphAppearance } from '../../appearance/model';
import type { FGNode } from '../../model/build';
import { renderNodeBody } from './body';

const MAX_CACHED_GLYPHS = 2_048;

interface CachedGlyph {
  canvas: CanvasImageSource;
  height: number;
  width: number;
}

export interface RenderCachedNodeGlyphOptions {
  appearance: Pick<GraphAppearance, 'nodeSelectionBorder' | 'transparent'>;
  ctx: CanvasRenderingContext2D;
  decoration: NodeDecorationPayload | undefined;
  globalScale: number;
  isSelected: boolean;
  node: FGNode;
  opacity: number;
}

const glyphs = new Map<string, CachedGlyph>();

export function renderCachedNodeGlyph(options: RenderCachedNodeGlyphOptions): boolean {
  const scale = getGlyphScale(options.globalScale);
  const key = getGlyphKey(options, scale);
  let glyph = glyphs.get(key);

  if (!glyph) {
    glyph = createGlyph(options, scale);
    if (!glyph) return false;
    retainGlyph(key, glyph);
  } else {
    glyphs.delete(key);
    glyphs.set(key, glyph);
  }

  const x = options.node.x ?? 0;
  const y = options.node.y ?? 0;
  options.ctx.save();
  options.ctx.globalAlpha = 1;
  options.ctx.drawImage(
    glyph.canvas,
    x - glyph.width / 2,
    y - glyph.height / 2,
    glyph.width,
    glyph.height,
  );
  options.ctx.restore();
  return true;
}

function createGlyph(
  options: RenderCachedNodeGlyphOptions,
  scale: number,
): CachedGlyph | undefined {
  const bounds = getNodeBounds(options.node);
  const logicalScale = scale / getDeviceScale();
  const padding = Math.max(4 / logicalScale, options.node.borderWidth / logicalScale + 2);
  const width = bounds.width + padding * 2;
  const height = bounds.height + padding * 2;
  const canvas = createCanvas(Math.ceil(width * scale), Math.ceil(height * scale));
  if (!canvas) return undefined;

  const context = getCanvasContext(canvas);
  if (!context) return undefined;
  context.scale(scale, scale);

  renderNodeBody({
    ...options,
    ctx: context,
    globalScale: logicalScale,
    node: {
      ...options.node,
      x: width / 2,
      y: height / 2,
    },
  });

  return { canvas, height, width };
}

function createCanvas(width: number, height: number): CanvasImageSource | undefined {
  const OffscreenCanvasConstructor = globalThis.OffscreenCanvas;
  if (typeof OffscreenCanvasConstructor === 'function') {
    return new OffscreenCanvasConstructor(width, height);
  }

  if (typeof document === 'undefined') return undefined;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function getCanvasContext(canvas: CanvasImageSource): CanvasRenderingContext2D | undefined {
  try {
    const context = (canvas as HTMLCanvasElement).getContext?.('2d');
    return context as unknown as CanvasRenderingContext2D | undefined;
  } catch {
    return undefined;
  }
}

function getGlyphScale(globalScale: number): number {
  return Math.min(4, Math.max(0.5, Math.round(globalScale * getDeviceScale() * 2) / 2));
}

function getDeviceScale(): number {
  return typeof devicePixelRatio === 'number' ? devicePixelRatio : 1;
}

function getNodeBounds(node: FGNode): { height: number; width: number } {
  if (node.shape2D === 'rectangle' && node.shapeSize2D) {
    return node.shapeSize2D;
  }

  return { height: node.size * 2, width: node.size * 2 };
}

function getGlyphKey(options: RenderCachedNodeGlyphOptions, scale: number): string {
  const { appearance, decoration, isSelected, node, opacity } = options;
  return JSON.stringify([
    appearance.nodeSelectionBorder,
    appearance.transparent,
    decoration?.border,
    decoration?.color,
    isSelected,
    node.borderColor,
    node.borderWidth,
    node.color,
    node.cornerRadius2D,
    node.fillOpacity2D,
    node.nodeType,
    node.shape2D,
    node.shapeSize2D,
    node.size,
    opacity,
    scale,
  ]);
}

function retainGlyph(key: string, glyph: CachedGlyph): void {
  if (glyphs.size >= MAX_CACHED_GLYPHS) {
    const oldestKey = glyphs.keys().next().value;
    if (oldestKey !== undefined) glyphs.delete(oldestKey);
  }
  glyphs.set(key, glyph);
}
