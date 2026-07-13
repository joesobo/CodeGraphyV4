import { describe, expect, it, vi } from 'vitest';
import { NodeLabelSpriteCache } from '../../../../../src/webview/components/graph/rendering/node/labelSprite';

function canvasFactory() {
  const context = {
    fillStyle: '',
    fillText: vi.fn(),
    font: '',
    measureText: vi.fn(() => ({ width: 24 })),
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
