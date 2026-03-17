import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../../src/webview/components/graph/rendering/shapes2D', () => ({
  drawShape: vi.fn(),
}));

import { drawShape } from '../../../../src/webview/components/graph/rendering/shapes2D';
import type { FGNode } from '../../../../src/webview/components/graphModel';
import { paintNodePointerArea } from '../../../../src/webview/components/graph/rendering/nodePointer';

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

describe('graph/rendering/nodePointer', () => {
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
});
