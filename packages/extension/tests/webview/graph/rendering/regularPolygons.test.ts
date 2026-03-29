import { describe, it, expect, vi } from 'vitest';
import { drawTriangle, drawHexagon } from '../../../../src/webview/components/graph/rendering/shapes/regularPolygons';

function makeCtx() {
  return {
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

describe('drawTriangle', () => {
  it('begins and closes the path', () => {
    const ctx = makeCtx();
    drawTriangle(ctx, 0, 0, 10);
    expect(ctx.beginPath).toHaveBeenCalledOnce();
    expect(ctx.closePath).toHaveBeenCalledOnce();
  });

  it('moves to the first vertex and lines to two more', () => {
    const ctx = makeCtx();
    drawTriangle(ctx, 0, 0, 10);
    expect(ctx.moveTo).toHaveBeenCalledOnce();
    expect(ctx.lineTo).toHaveBeenCalledTimes(2);
  });

  it('places the first vertex at the top (y is negative from center)', () => {
    const ctx = makeCtx();
    drawTriangle(ctx, 50, 50, 10);
    const [firstX, firstY] = (ctx.moveTo as ReturnType<typeof vi.fn>).mock.calls[0];
    // Top vertex: x + size * cos(-PI/2), y + size * sin(-PI/2)
    expect(firstX).toBeCloseTo(50);
    expect(firstY).toBeCloseTo(40);
  });

  it('places subsequent vertices using 120-degree spacing', () => {
    const ctx = makeCtx();
    drawTriangle(ctx, 0, 0, 10);

    const lineToArgs = (ctx.lineTo as ReturnType<typeof vi.fn>).mock.calls;
    // Second vertex at angle -PI/2 + 2*PI/3 = PI/6
    expect(lineToArgs[0][0]).toBeCloseTo(10 * Math.cos(Math.PI / 6));
    expect(lineToArgs[0][1]).toBeCloseTo(10 * Math.sin(Math.PI / 6));
  });

  it('offsets all vertices by the center position', () => {
    const ctx = makeCtx();
    drawTriangle(ctx, 100, 200, 10);

    const [moveX, moveY] = (ctx.moveTo as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(moveX).toBeCloseTo(100);
    expect(moveY).toBeCloseTo(190);

    const lineToArgs = (ctx.lineTo as ReturnType<typeof vi.fn>).mock.calls;
    for (const [px, py] of lineToArgs) {
      // All vertices should be within size distance from center
      const dist = Math.sqrt((px - 100) ** 2 + (py - 200) ** 2);
      expect(dist).toBeCloseTo(10);
    }
  });

  it('scales vertices proportionally with size parameter', () => {
    const ctx1 = makeCtx();
    drawTriangle(ctx1, 0, 0, 5);
    const [, y1] = (ctx1.moveTo as ReturnType<typeof vi.fn>).mock.calls[0];

    const ctx2 = makeCtx();
    drawTriangle(ctx2, 0, 0, 20);
    const [, y2] = (ctx2.moveTo as ReturnType<typeof vi.fn>).mock.calls[0];

    expect(Math.abs(y2)).toBe(4 * Math.abs(y1));
  });
});

describe('drawHexagon', () => {
  it('begins and closes the path', () => {
    const ctx = makeCtx();
    drawHexagon(ctx, 0, 0, 10);
    expect(ctx.beginPath).toHaveBeenCalledOnce();
    expect(ctx.closePath).toHaveBeenCalledOnce();
  });

  it('moves to the first vertex and lines to five more', () => {
    const ctx = makeCtx();
    drawHexagon(ctx, 0, 0, 10);
    expect(ctx.moveTo).toHaveBeenCalledOnce();
    expect(ctx.lineTo).toHaveBeenCalledTimes(5);
  });

  it('places the first vertex at the top', () => {
    const ctx = makeCtx();
    drawHexagon(ctx, 50, 50, 10);
    const [firstX, firstY] = (ctx.moveTo as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(firstX).toBeCloseTo(50);
    expect(firstY).toBeCloseTo(40);
  });

  it('places all vertices at equal distance from center', () => {
    const ctx = makeCtx();
    drawHexagon(ctx, 0, 0, 10);

    const [moveX, moveY] = (ctx.moveTo as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(Math.sqrt(moveX ** 2 + moveY ** 2)).toBeCloseTo(10);

    const lineToArgs = (ctx.lineTo as ReturnType<typeof vi.fn>).mock.calls;
    for (const [px, py] of lineToArgs) {
      expect(Math.sqrt(px ** 2 + py ** 2)).toBeCloseTo(10);
    }
  });

  it('uses 60-degree spacing between vertices', () => {
    const ctx = makeCtx();
    drawHexagon(ctx, 0, 0, 10);

    const allPoints = [
      (ctx.moveTo as ReturnType<typeof vi.fn>).mock.calls[0],
      ...(ctx.lineTo as ReturnType<typeof vi.fn>).mock.calls,
    ];

    // Check that consecutive points are separated by 60 degrees
    for (let i = 0; i < allPoints.length - 1; i++) {
      const angle1 = Math.atan2(allPoints[i][1], allPoints[i][0]);
      const angle2 = Math.atan2(allPoints[i + 1][1], allPoints[i + 1][0]);
      let diff = angle2 - angle1;
      if (diff < 0) diff += 2 * Math.PI;
      expect(diff).toBeCloseTo(Math.PI / 3);
    }
  });

  it('offsets all vertices by the center position', () => {
    const ctx = makeCtx();
    drawHexagon(ctx, 100, 200, 10);

    const allCalls = [
      (ctx.moveTo as ReturnType<typeof vi.fn>).mock.calls[0],
      ...(ctx.lineTo as ReturnType<typeof vi.fn>).mock.calls,
    ];

    for (const [px, py] of allCalls) {
      const dist = Math.sqrt((px - 100) ** 2 + (py - 200) ** 2);
      expect(dist).toBeCloseTo(10);
    }
  });
});
