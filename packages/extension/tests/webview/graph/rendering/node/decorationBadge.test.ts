import { describe, expect, it, vi } from 'vitest';
import { renderNodeDecorationBadge } from '../../../../../src/webview/components/graph/rendering/node/decorationBadge';

describe('graph/rendering/node/decorationBadge', () => {
  it('draws a problem badge at the requested corner', () => {
    const ctx = {
      fillRect: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn(() => ({ width: 8 })),
    } as unknown as CanvasRenderingContext2D;

    renderNodeDecorationBadge(
      ctx,
      { id: 'src/app.ts', label: 'app.ts', color: '#ffffff', x: 10, y: 20, size: 12 } as never,
      { badge: { text: '3', bgColor: '#f14c4c', position: 'bottom-right' } },
      1,
    );

    expect(ctx.fillRect).toHaveBeenCalledOnce();
    expect(ctx.fillText).toHaveBeenCalledWith('3', expect.any(Number), expect.any(Number));
  });

  it('does nothing without a badge', () => {
    const ctx = { fillRect: vi.fn(), fillText: vi.fn() } as unknown as CanvasRenderingContext2D;

    renderNodeDecorationBadge(ctx, { id: 'src/app.ts', label: 'app.ts', color: '#ffffff' } as never, undefined, 1);

    expect(ctx.fillRect).not.toHaveBeenCalled();
  });
});
