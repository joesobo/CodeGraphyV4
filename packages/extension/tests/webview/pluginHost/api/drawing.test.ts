import { describe, it, expect, vi } from 'vitest';
import { drawBadge, drawProgressRing, drawLabel } from '../../../../src/webview/pluginHost/api/drawing';

function makeCtx(): CanvasRenderingContext2D {
  return {
    font: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    textAlign: 'left' as CanvasTextAlign,
    textBaseline: 'alphabetic' as CanvasTextBaseline,
    measureText: vi.fn(() => ({ width: 24 })),
    beginPath: vi.fn(),
    roundRect: vi.fn(),
    fill: vi.fn(),
    fillText: vi.fn(),
    arc: vi.fn(),
    stroke: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

describe('drawing', () => {
  describe('drawBadge', () => {
    it('sets font with the given fontSize', () => {
      const ctx = makeCtx();
      drawBadge(ctx, { text: 'Hi', x: 10, y: 10, fontSize: 12 });
      expect(ctx.font).toContain('12px');
    });

    it('uses default bgColor #EF4444 when not specified', () => {
      const ctx = makeCtx();
      drawBadge(ctx, { text: 'Hi', x: 10, y: 10 });
      expect(ctx.fillStyle).toBe('#FFFFFF');
    });

    it('calls fill and fillText', () => {
      const ctx = makeCtx();
      drawBadge(ctx, { text: '3', x: 5, y: 5 });
      expect((ctx.fill as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
      expect((ctx.fillText as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith('3', 5, 5);
    });
  });

  describe('drawProgressRing', () => {
    it('sets strokeStyle to the given color', () => {
      const ctx = makeCtx();
      drawProgressRing(ctx, { x: 0, y: 0, radius: 10, color: '#00FF00', progress: 0.5 });
      expect(ctx.strokeStyle).toBe('#00FF00');
    });

    it('calls stroke after arc', () => {
      const ctx = makeCtx();
      drawProgressRing(ctx, { x: 0, y: 0, radius: 10, color: '#fff' });
      expect((ctx.arc as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
      expect((ctx.stroke as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
    });
  });

  describe('drawLabel', () => {
    it('sets font with the given fontSize', () => {
      const ctx = makeCtx();
      drawLabel(ctx, { text: 'hello', x: 0, y: 0, fontSize: 14 });
      expect(ctx.font).toContain('14px');
    });

    it('uses default color #FFFFFF when not specified', () => {
      const ctx = makeCtx();
      drawLabel(ctx, { text: 'hi', x: 0, y: 0 });
      expect(ctx.fillStyle).toBe('#FFFFFF');
    });

    it('calls fillText with the text at the given position', () => {
      const ctx = makeCtx();
      drawLabel(ctx, { text: 'test', x: 20, y: 30 });
      expect((ctx.fillText as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith('test', 20, 30);
    });
  });
});
