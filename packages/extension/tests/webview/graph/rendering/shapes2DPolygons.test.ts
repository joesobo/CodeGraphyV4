import { describe, it, expect, vi } from 'vitest';
import { drawTriangle, drawHexagon, drawStar } from '../../../../src/webview/components/graph/rendering/shapes2DPolygons';

function makeCtx() {
  return {
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

describe('drawTriangle', () => {
  it('begins a path', () => {
    const ctx = makeCtx();
    drawTriangle(ctx, 0, 0, 10);
    expect(ctx.beginPath).toHaveBeenCalledOnce();
  });

  it('closes the path', () => {
    const ctx = makeCtx();
    drawTriangle(ctx, 0, 0, 10);
    expect(ctx.closePath).toHaveBeenCalledOnce();
  });

  it('moves to the first vertex and lines to two more', () => {
    const ctx = makeCtx();
    drawTriangle(ctx, 0, 0, 10);
    expect(ctx.moveTo).toHaveBeenCalledOnce();
    expect(ctx.lineTo).toHaveBeenCalledTimes(2);
  });
});

describe('drawHexagon', () => {
  it('begins a path', () => {
    const ctx = makeCtx();
    drawHexagon(ctx, 0, 0, 10);
    expect(ctx.beginPath).toHaveBeenCalledOnce();
  });

  it('closes the path', () => {
    const ctx = makeCtx();
    drawHexagon(ctx, 0, 0, 10);
    expect(ctx.closePath).toHaveBeenCalledOnce();
  });

  it('moves to the first vertex and lines to five more', () => {
    const ctx = makeCtx();
    drawHexagon(ctx, 0, 0, 10);
    expect(ctx.moveTo).toHaveBeenCalledOnce();
    expect(ctx.lineTo).toHaveBeenCalledTimes(5);
  });
});

describe('drawStar', () => {
  it('begins a path', () => {
    const ctx = makeCtx();
    drawStar(ctx, 0, 0, 10);
    expect(ctx.beginPath).toHaveBeenCalledOnce();
  });

  it('closes the path', () => {
    const ctx = makeCtx();
    drawStar(ctx, 0, 0, 10);
    expect(ctx.closePath).toHaveBeenCalledOnce();
  });

  it('draws 10 segments (5 points × 2 radii) with one moveTo and nine lineTo calls', () => {
    const ctx = makeCtx();
    drawStar(ctx, 0, 0, 10);
    expect(ctx.moveTo).toHaveBeenCalledOnce();
    expect(ctx.lineTo).toHaveBeenCalledTimes(9);
  });
});
