import { describe, expect, it, vi } from 'vitest';
import { type DirectionMode, type EdgeDecorationPayload } from '../../../../src/shared/types';
import type { ThemeKind } from '../../../../src/webview/hooks/useTheme';
import type { FGLink } from '../../../../src/webview/components/graphModel';
import { renderBidirectionalLink } from '../../../../src/webview/components/graph/rendering/bidirectionalLink';

function createDependencies(overrides: Partial<{
  directionColor: string;
  directionMode: DirectionMode;
  edgeDecorations: Record<string, EdgeDecorationPayload> | undefined;
  highlightedNodeId: string | null;
  theme: ThemeKind;
}> = {}) {
  return {
    directionColorRef: { current: overrides.directionColor ?? '#22c55e' },
    directionModeRef: { current: overrides.directionMode ?? 'arrows' },
    edgeDecorationsRef: { current: overrides.edgeDecorations },
    highlightedNodeRef: { current: overrides.highlightedNodeId ?? null },
    themeRef: { current: overrides.theme ?? 'dark' },
  };
}

function createLink(overrides: Partial<FGLink> = {}): FGLink {
  return {
    id: 'src/app.ts->src/utils.ts',
    from: 'src/app.ts',
    to: 'src/utils.ts',
    bidirectional: true,
    source: { id: 'src/app.ts', x: 0, y: 10, size: 10 },
    target: { id: 'src/utils.ts', x: 80, y: 10, size: 10 },
    ...overrides,
  } as FGLink;
}

function createContext(): CanvasRenderingContext2D {
  return {
    beginPath: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    stroke: vi.fn(),
    fillStyle: '',
    globalAlpha: 1,
    lineWidth: 0,
    strokeStyle: '',
  } as unknown as CanvasRenderingContext2D;
}

describe('graph/rendering/bidirectionalLink', () => {
  it('draws a bidirectional link line and arrow heads in arrows mode', () => {
    const ctx = createContext();

    renderBidirectionalLink(createDependencies(), createLink(), ctx, 1);

    expect(ctx.moveTo).toHaveBeenCalled();
    expect(ctx.lineTo).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalledOnce();
    expect(ctx.fill).toHaveBeenCalledTimes(2);
  });

  it('skips bidirectional canvas drawing when direction mode is not arrows', () => {
    const ctx = createContext();

    renderBidirectionalLink(
      createDependencies({ directionMode: 'particles' }),
      createLink(),
      ctx,
      1,
    );

    expect(ctx.moveTo).not.toHaveBeenCalled();
    expect(ctx.fill).not.toHaveBeenCalled();
  });

  it('skips drawing when link geometry cannot be computed', () => {
    const ctx = createContext();

    renderBidirectionalLink(
      createDependencies(),
      createLink({
        source: { id: 'src/app.ts', x: 0, y: 10, size: 10 },
        target: { id: 'src/utils.ts', x: 15, y: 10, size: 10 },
      }),
      ctx,
      1,
    );

    expect(ctx.stroke).not.toHaveBeenCalled();
    expect(ctx.fill).not.toHaveBeenCalled();
  });
});
