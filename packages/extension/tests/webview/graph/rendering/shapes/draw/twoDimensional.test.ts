import { describe, it, expect, vi, beforeEach } from 'vitest';
import { drawShape } from '../../../../../../src/webview/components/graph/rendering/shapes/draw/twoDimensional';

function createMockContext() {
  return {
    beginPath: vi.fn(),
    arc: vi.fn(),
    rect: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    closePath: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

describe('shapes2D', () => {
  let ctx: CanvasRenderingContext2D;
  let mock: ReturnType<typeof createMockContext>;

  beforeEach(() => {
    ctx = createMockContext();
    mock = ctx as unknown as ReturnType<typeof createMockContext>;
  });

  describe('drawShape dispatcher', () => {
    it.each([
      'circle',
      'square',
      'diamond',
      'rectangle',
      'triangle',
      'hexagon',
      'star',
    ] as const)('routes "%s" to the correct drawing function', (shape) => {
      drawShape(ctx, shape, 10, 20, 5);
      expect(mock.beginPath).toHaveBeenCalledOnce();
    });
  });

  describe('circle', () => {
    it('calls arc with correct arguments', () => {
      drawShape(ctx, 'circle', 10, 20, 5);

      expect(mock.beginPath).toHaveBeenCalledOnce();
      expect(mock.arc).toHaveBeenCalledWith(10, 20, 5, 0, 2 * Math.PI, false);
      expect(mock.closePath).not.toHaveBeenCalled();
    });
  });

  describe('square', () => {
    it('calls rect with correct arguments and closes path', () => {
      drawShape(ctx, 'square', 10, 20, 5);

      expect(mock.beginPath).toHaveBeenCalledOnce();
      expect(mock.rect).toHaveBeenCalledWith(10 - 5, 20 - 5, 5 * 2, 5 * 2);
      expect(mock.closePath).toHaveBeenCalledOnce();
    });
  });

  describe('rectangle', () => {
    it('calls rect with explicit width and height centered on the node', () => {
      drawShape(ctx, 'rectangle', 10, 20, 5, {
        height: 12,
        width: 30,
      });

      expect(mock.beginPath).toHaveBeenCalledOnce();
      expect(mock.rect).toHaveBeenCalledWith(-5, 14, 30, 12);
      expect(mock.closePath).toHaveBeenCalledOnce();
    });

    it('falls back to square dimensions when no explicit size is provided', () => {
      drawShape(ctx, 'rectangle', 10, 20, 5);

      expect(mock.rect).toHaveBeenCalledWith(5, 15, 10, 10);
    });

    it('draws rounded rectangles when a corner radius is provided', () => {
      drawShape(ctx, 'rectangle', 10, 20, 5, {
        height: 12,
        width: 30,
      }, 3);

      expect(mock.rect).not.toHaveBeenCalled();
      expect(mock.moveTo).toHaveBeenCalledWith(-2, 14);
      expect(mock.lineTo).toHaveBeenCalledWith(22, 14);
      expect(mock.quadraticCurveTo).toHaveBeenCalledTimes(4);
      expect(mock.closePath).toHaveBeenCalledOnce();
    });
  });

  describe('diamond', () => {
    it('calls moveTo once, lineTo three times, and closes path', () => {
      drawShape(ctx, 'diamond', 10, 20, 5);

      expect(mock.beginPath).toHaveBeenCalledOnce();
      expect(mock.moveTo).toHaveBeenCalledOnce();
      expect(mock.moveTo).toHaveBeenCalledWith(10, 20 - 5);
      expect(mock.lineTo).toHaveBeenCalledTimes(3);
      expect(mock.lineTo).toHaveBeenNthCalledWith(1, 10 + 5, 20);
      expect(mock.lineTo).toHaveBeenNthCalledWith(2, 10, 20 + 5);
      expect(mock.lineTo).toHaveBeenNthCalledWith(3, 10 - 5, 20);
      expect(mock.closePath).toHaveBeenCalledOnce();
    });
  });

  describe('triangle', () => {
    it('calls moveTo once, lineTo twice, and closes path', () => {
      drawShape(ctx, 'triangle', 10, 20, 5);

      expect(mock.beginPath).toHaveBeenCalledOnce();
      expect(mock.moveTo).toHaveBeenCalledOnce();
      expect(mock.lineTo).toHaveBeenCalledTimes(2);
      expect(mock.closePath).toHaveBeenCalledOnce();
    });

    it('starts from the top vertex', () => {
      drawShape(ctx, 'triangle', 0, 0, 10);

      // Top vertex: cos(-PI/2) = 0, sin(-PI/2) = -1 => (0, -10)
      expect(mock.moveTo).toHaveBeenCalledWith(
        expect.closeTo(0, 10),
        expect.closeTo(-10, 10),
      );
    });
  });

  describe('hexagon', () => {
    it('calls moveTo once, lineTo five times, and closes path', () => {
      drawShape(ctx, 'hexagon', 10, 20, 5);

      expect(mock.beginPath).toHaveBeenCalledOnce();
      expect(mock.moveTo).toHaveBeenCalledOnce();
      expect(mock.lineTo).toHaveBeenCalledTimes(5);
      expect(mock.closePath).toHaveBeenCalledOnce();
    });

    it('starts from the top vertex', () => {
      drawShape(ctx, 'hexagon', 0, 0, 10);

      // Top vertex: cos(-PI/2) = 0, sin(-PI/2) = -1 => (0, -10)
      expect(mock.moveTo).toHaveBeenCalledWith(
        expect.closeTo(0, 10),
        expect.closeTo(-10, 10),
      );
    });
  });

  describe('star', () => {
    it('calls moveTo once, lineTo nine times, and closes path', () => {
      drawShape(ctx, 'star', 10, 20, 5);

      expect(mock.beginPath).toHaveBeenCalledOnce();
      expect(mock.moveTo).toHaveBeenCalledOnce();
      expect(mock.lineTo).toHaveBeenCalledTimes(9);
      expect(mock.closePath).toHaveBeenCalledOnce();
    });

    it('starts from the top vertex at outer radius', () => {
      drawShape(ctx, 'star', 0, 0, 10);

      // Top vertex: outerRadius * cos(-PI/2) = 0, outerRadius * sin(-PI/2) = -10
      expect(mock.moveTo).toHaveBeenCalledWith(
        expect.closeTo(0, 10),
        expect.closeTo(-10, 10),
      );
    });

    it('alternates between outer and inner radius', () => {
      const size = 10;
      const innerRadius = size * 0.4;
      drawShape(ctx, 'star', 0, 0, size);

      // Second point (i=1) uses inner radius
      const step = Math.PI / 5;
      const startAngle = -Math.PI / 2;
      const a1 = startAngle + 1 * step;
      const expectedX = innerRadius * Math.cos(a1);
      const expectedY = innerRadius * Math.sin(a1);

      expect(mock.lineTo).toHaveBeenNthCalledWith(
        1,
        expect.closeTo(expectedX, 10),
        expect.closeTo(expectedY, 10),
      );
    });
  });
});
