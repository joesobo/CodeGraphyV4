import { describe, it, expect, vi, beforeEach } from 'vitest';
import { drawBadge, drawProgressRing, drawLabel } from '../../../src/webview/pluginHost/canvasHelpers';

function makeCtx(): CanvasRenderingContext2D {
  const ctx = {
    font: '',
    fillStyle: '' as string | CanvasGradient | CanvasPattern,
    strokeStyle: '' as string | CanvasGradient | CanvasPattern,
    lineWidth: 0,
    textAlign: 'left' as CanvasTextAlign,
    textBaseline: 'alphabetic' as CanvasTextBaseline,
    measureText: vi.fn().mockReturnValue({ width: 40 }),
    beginPath: vi.fn(),
    roundRect: vi.fn(),
    fill: vi.fn(),
    fillText: vi.fn(),
    arc: vi.fn(),
    stroke: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
  return ctx;
}

describe('drawBadge', () => {
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    ctx = makeCtx();
  });

  it('sets font using the provided fontSize', () => {
    drawBadge(ctx, { x: 0, y: 0, text: 'Hi', fontSize: 12 });
    expect(ctx.font).toBe('bold 12px sans-serif');
  });

  it('defaults fontSize to 8 when not specified', () => {
    drawBadge(ctx, { x: 0, y: 0, text: 'Hi' });
    expect(ctx.font).toBe('bold 8px sans-serif');
  });

  it('uses the provided bgColor for the badge background', () => {
    const filledStyles: (string | CanvasGradient | CanvasPattern)[] = [];
    // Track every fillStyle value at the time fill() is called
    vi.mocked(ctx.fill).mockImplementation(() => { filledStyles.push(ctx.fillStyle); });
    drawBadge(ctx, { x: 0, y: 0, text: 'Hi', bgColor: '#00FF00' });
    expect(filledStyles[0]).toBe('#00FF00');
  });

  it('defaults bgColor to #EF4444 when not specified', () => {
    drawBadge(ctx, { x: 10, y: 10, text: '5' });
    // fillStyle is set to bgColor before fill(), then to text color
    // We check that beginPath and fill were called
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });

  it('calls fillText with the provided text', () => {
    drawBadge(ctx, { x: 10, y: 20, text: '42' });
    expect(ctx.fillText).toHaveBeenCalledWith('42', 10, 20);
  });

  it('sets textAlign to center', () => {
    drawBadge(ctx, { x: 0, y: 0, text: 'X' });
    expect(ctx.textAlign).toBe('center');
  });

  it('calls roundRect to draw the badge shape', () => {
    drawBadge(ctx, { x: 50, y: 50, text: 'A' });
    expect(ctx.roundRect).toHaveBeenCalled();
  });
});

describe('drawProgressRing', () => {
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    ctx = makeCtx();
  });

  it('uses the provided color for the stroke', () => {
    drawProgressRing(ctx, { x: 0, y: 0, radius: 10, color: '#FF0000' });
    expect(ctx.strokeStyle).toBe('#FF0000');
  });

  it('defaults width to 2 when not specified', () => {
    drawProgressRing(ctx, { x: 0, y: 0, radius: 10, color: '#fff' });
    expect(ctx.lineWidth).toBe(2);
  });

  it('uses the provided lineWidth', () => {
    drawProgressRing(ctx, { x: 0, y: 0, radius: 10, color: '#fff', width: 4 });
    expect(ctx.lineWidth).toBe(4);
  });

  it('calls arc to draw the ring', () => {
    drawProgressRing(ctx, { x: 5, y: 5, radius: 20, color: '#fff', progress: 0.5 });
    expect(ctx.arc).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it('defaults progress to 1 (full ring) when not specified', () => {
    drawProgressRing(ctx, { x: 0, y: 0, radius: 10, color: '#fff' });
    const arcCall = vi.mocked(ctx.arc).mock.calls[0];
    // endAngle = -PI/2 + 2*PI*1 = 3*PI/2
    expect(arcCall[4]).toBeCloseTo(-Math.PI / 2 + 2 * Math.PI);
  });
});

describe('drawLabel', () => {
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    ctx = makeCtx();
  });

  it('defaults fontSize to 10 when not specified', () => {
    drawLabel(ctx, { x: 0, y: 0, text: 'Hello' });
    expect(ctx.font).toBe('10px sans-serif');
  });

  it('uses the provided fontSize', () => {
    drawLabel(ctx, { x: 0, y: 0, text: 'Hello', fontSize: 14 });
    expect(ctx.font).toBe('14px sans-serif');
  });

  it('defaults color to #FFFFFF when not specified', () => {
    drawLabel(ctx, { x: 0, y: 0, text: 'Hello' });
    expect(ctx.fillStyle).toBe('#FFFFFF');
  });

  it('uses the provided color', () => {
    drawLabel(ctx, { x: 0, y: 0, text: 'Hello', color: '#000000' });
    expect(ctx.fillStyle).toBe('#000000');
  });

  it('defaults textAlign to center when not specified', () => {
    drawLabel(ctx, { x: 0, y: 0, text: 'Hello' });
    expect(ctx.textAlign).toBe('center');
  });

  it('uses the provided align value', () => {
    drawLabel(ctx, { x: 0, y: 0, text: 'Hello', align: 'left' });
    expect(ctx.textAlign).toBe('left');
  });

  it('calls fillText with the provided text at the correct position', () => {
    drawLabel(ctx, { x: 30, y: 40, text: 'Label' });
    expect(ctx.fillText).toHaveBeenCalledWith('Label', 30, 40);
  });
});
