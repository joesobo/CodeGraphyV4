import { describe, expect, it, vi } from 'vitest';
import { canvasPointerGeometry } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/camera/geometry/canvas';

describe('owned graph canvas geometry', () => {
  it('reads local pointer coordinates and bounded canvas dimensions together', () => {
    const getBoundingClientRect = vi.fn(() => ({
      height: 0,
      left: 10,
      top: 20,
      width: 0,
    }));
    const canvas = { getBoundingClientRect } as unknown as HTMLCanvasElement;

    expect(canvasPointerGeometry(canvas, { clientX: 14, clientY: 25 })).toEqual({
      height: 1,
      width: 1,
      x: 4,
      y: 5,
    });
    expect(getBoundingClientRect).toHaveBeenCalledOnce();
  });
});
