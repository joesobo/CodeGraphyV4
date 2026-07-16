import { describe, expect, it, vi } from 'vitest';
import { renderNodeLabel } from '../../../../../src/webview/components/graph/rendering/node/label';
import { NodeLabelSpriteCache } from '../../../../../src/webview/components/graph/rendering/node/labelSprite';
import type { FGNode } from '../../../../../src/webview/components/graph/model/build';

function node(): FGNode {
  return {
    baseOpacity: 1,
    borderColor: '#000000',
    borderWidth: 1,
    color: '#ffffff',
    id: 'app',
    isFavorite: false,
    label: 'app.ts',
    size: 10,
    x: 20,
    y: 30,
  } as FGNode;
}

function spriteCache() {
  const spriteContext = {
    fillStyle: '',
    fillText: vi.fn(),
    font: '',
    measureText: vi.fn(() => ({ width: 24 })),
    scale: vi.fn(),
    textAlign: 'left',
    textBaseline: 'top',
  };
  const spriteCanvas = {
    getContext: vi.fn(() => spriteContext),
    height: 0,
    width: 0,
  } as unknown as HTMLCanvasElement;
  const createCanvas = vi.fn(() => spriteCanvas);
  return {
    cache: new NodeLabelSpriteCache(10, createCanvas),
    createCanvas,
    spriteCanvas,
  };
}

function destinationContext(): CanvasRenderingContext2D {
  return {
    drawImage: vi.fn(),
    fillText: vi.fn(),
    globalAlpha: 1,
  } as unknown as CanvasRenderingContext2D;
}

describe('renderNodeLabel', () => {
  it('reuses a cached sprite while preserving screen-space placement and fade', () => {
    const sprites = spriteCache();
    const ctx = destinationContext();
    const options = {
      appearance: { labelForeground: '#ffffff', labelMutedForeground: '#999999' },
      ctx,
      decoration: undefined,
      globalScale: 1,
      isHighlighted: true,
      node: node(),
      opacity: 0.8,
      spriteCache: sprites.cache,
    };

    renderNodeLabel(options);
    renderNodeLabel(options);

    expect(sprites.createCanvas).toHaveBeenCalledOnce();
    expect(ctx.fillText).not.toHaveBeenCalled();
    expect(ctx.drawImage).toHaveBeenCalledTimes(2);
    expect(ctx.drawImage).toHaveBeenLastCalledWith(
      sprites.spriteCanvas,
      7,
      42,
      26,
      15,
    );
    expect(ctx.globalAlpha).toBeCloseTo(0.8 * ((1 - 0.35) / 1.2));
  });

  it('positions labels beneath the zoom-compensated node boundary', () => {
    const sprites = spriteCache();
    const ctx = destinationContext();

    renderNodeLabel({
      ctx,
      decoration: undefined,
      globalScale: 4,
      isHighlighted: true,
      node: node(),
      opacity: 1,
      spriteCache: sprites.cache,
      visualScale: 0.5,
    });

    expect(ctx.drawImage).toHaveBeenCalledWith(
      sprites.spriteCanvas,
      16.75,
      35.5,
      6.5,
      3.75,
    );
  });

  it('does not rasterize labels below the zoom fade threshold', () => {
    const sprites = spriteCache();
    const ctx = destinationContext();

    renderNodeLabel({
      ctx,
      decoration: undefined,
      globalScale: 0.35,
      isHighlighted: true,
      node: node(),
      opacity: 1,
      spriteCache: sprites.cache,
    });

    expect(sprites.createCanvas).not.toHaveBeenCalled();
    expect(ctx.drawImage).not.toHaveBeenCalled();
  });
});
