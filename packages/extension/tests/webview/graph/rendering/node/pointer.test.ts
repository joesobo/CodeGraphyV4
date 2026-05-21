import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../../src/webview/components/graph/rendering/shapes/draw/twoDimensional', () => ({
  drawShape: vi.fn(),
}));

import { drawShape } from '../../../../../src/webview/components/graph/rendering/shapes/draw/twoDimensional';
import type { FGNode } from '../../../../../src/webview/components/graph/model/build';
import { paintNodePointerArea } from '../../../../../src/webview/components/graph/rendering/node/pointer';

function createNode(overrides: Partial<FGNode> = {}): FGNode {
  return {
    id: 'src/app.ts',
    label: 'app.ts',
    size: 16,
    color: '#3b82f6',
    borderColor: '#1d4ed8',
    borderWidth: 2,
    baseOpacity: 1,
    isFavorite: false,
    x: 24,
    y: 48,
    ...overrides,
  } as FGNode;
}

describe('graph/rendering/node/pointer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('paints the expanded pointer area around the node shape', () => {
    const ctx = {
      fill: vi.fn(),
      fillStyle: '',
    } as unknown as CanvasRenderingContext2D;

    paintNodePointerArea(createNode(), '#ffffff', ctx);

    expect(drawShape).toHaveBeenCalledWith(ctx, 'circle', 24, 48, 18);
    expect(ctx.fillStyle).toBe('#ffffff');
    expect(ctx.fill).toHaveBeenCalled();
  });

  it('paints a rectangular plugin pointer area without changing the node shape', () => {
    const ctx = {
      fill: vi.fn(),
      fillRect: vi.fn(),
      fillStyle: '',
    } as unknown as CanvasRenderingContext2D;

    paintNodePointerArea(createNode({
      pointerArea2D: {
        height: 80,
        width: 120,
      },
    }), '#ffffff', ctx);

    expect(drawShape).not.toHaveBeenCalled();
    expect(ctx.fillStyle).toBe('#ffffff');
    expect(ctx.fillRect).toHaveBeenCalledWith(-36, 8, 120, 80);
    expect(ctx.fill).not.toHaveBeenCalled();
  });

});
