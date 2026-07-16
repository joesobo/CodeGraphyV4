import { describe, expect, it, vi } from 'vitest';
import { NodeLabelSpriteCache } from '../../../../../src/webview/components/graph/rendering/node/labelSprite';

function canvasFactory(metrics: Partial<TextMetrics> = {}) {
  const context = {
    fillStyle: '',
    fillText: vi.fn(),
    font: '',
    measureText: vi.fn(() => ({ width: 24, ...metrics })),
    scale: vi.fn(),
    textAlign: 'left',
    textBaseline: 'top',
  };
  const canvas = {
    getContext: vi.fn(() => context),
    height: 0,
    width: 0,
  } as unknown as HTMLCanvasElement;
  return { canvas, context };
}

describe('NodeLabelSpriteCache', () => {
  it('rasterizes equivalent labels once and reuses the sprite', () => {
    const { canvas, context } = canvasFactory();
    const createCanvas = vi.fn(() => canvas);
    const cache = new NodeLabelSpriteCache(2, createCanvas);

    const first = cache.get('app.ts', '#ffffff', 2);
    const second = cache.get('app.ts', '#ffffff', 2);

    expect(second).toBe(first);
    expect(createCanvas).toHaveBeenCalledOnce();
    expect(context.fillText).toHaveBeenCalledOnce();
    expect(context.scale).toHaveBeenCalledWith(2, 2);
    expect(first).toMatchObject({ cssHeight: 15, cssWidth: 26 });
    expect([canvas.width, canvas.height]).toEqual([52, 30]);
  });

  it('sizes the sprite from measured glyph bounds without clipping ascenders or descenders', () => {
    const { canvas, context } = canvasFactory({
      actualBoundingBoxAscent: 18,
      actualBoundingBoxDescent: 6,
      actualBoundingBoxLeft: 2,
      actualBoundingBoxRight: 25,
    });
    const cache = new NodeLabelSpriteCache(2, () => canvas);

    expect(cache.get('Ågj_', '#fff', 1)).toMatchObject({ cssHeight: 26, cssWidth: 29 });
    expect(context.fillText).toHaveBeenCalledWith('Ågj_', 3, 19);
    expect([canvas.width, canvas.height]).toEqual([29, 26]);
  });

  it('bounds backing-store memory independently of entry count', () => {
    const createCanvas = vi.fn(() => canvasFactory().canvas);
    const cache = new NodeLabelSpriteCache(10, createCanvas, 7_000);

    const first = cache.get('first', '#fff', 2);
    cache.get('second', '#fff', 2);

    expect(cache.get('first', '#fff', 2)).not.toBe(first);
    expect(createCanvas).toHaveBeenCalledTimes(3);
  });

  it('bounds memory by evicting the least recently used sprite', () => {
    const createCanvas = vi.fn(() => canvasFactory().canvas);
    const cache = new NodeLabelSpriteCache(2, createCanvas);

    const first = cache.get('first', '#fff', 1);
    cache.get('second', '#fff', 1);
    cache.get('first', '#fff', 1);
    cache.get('third', '#fff', 1);

    expect(cache.get('first', '#fff', 1)).toBe(first);
    cache.get('second', '#fff', 1);
    expect(createCanvas).toHaveBeenCalledTimes(4);
  });
});
