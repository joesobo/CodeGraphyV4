import { describe, expect, it, vi } from 'vitest';
import type { EdgeDecorationPayload } from '../../../../src/shared/plugins/decorations';
import type { DirectionMode } from '../../../../src/shared/settings/modes';
import type { ThemeKind } from '../../../../src/webview/theme/useTheme';
import type { FGLink } from '../../../../src/webview/components/graph/model/build';
import { renderBidirectionalLink } from '../../../../src/webview/components/graph/rendering/bidirectional/link';

interface ContextOperation {
  fillStyle: string;
  globalAlpha: number;
  kind: 'fill' | 'stroke';
  lineWidth: number;
  strokeStyle: string;
}

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

function createContext(): {
  ctx: CanvasRenderingContext2D;
  operations: ContextOperation[];
} {
  const operations: ContextOperation[] = [];
  const ctx = {
    beginPath: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(() => {
      operations.push({
        fillStyle: ctx.fillStyle,
        globalAlpha: ctx.globalAlpha,
        kind: 'fill',
        lineWidth: ctx.lineWidth,
        strokeStyle: ctx.strokeStyle,
      });
    }),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    stroke: vi.fn(() => {
      operations.push({
        fillStyle: ctx.fillStyle,
        globalAlpha: ctx.globalAlpha,
        kind: 'stroke',
        lineWidth: ctx.lineWidth,
        strokeStyle: ctx.strokeStyle,
      });
    }),
    fillStyle: '',
    globalAlpha: 1,
    lineWidth: 0,
    strokeStyle: '',
  };

  return {
    ctx: ctx as unknown as CanvasRenderingContext2D,
    operations,
  };
}

describe('graph/rendering/bidirectional/link', () => {
  it('draws a bidirectional link line and arrow heads in arrows mode', () => {
    const { ctx, operations } = createContext();

    renderBidirectionalLink(createDependencies(), createLink(), ctx, 1);

    expect(ctx.moveTo).toHaveBeenCalled();
    expect(ctx.lineTo).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalledOnce();
    expect(ctx.fill).toHaveBeenCalledTimes(2);
    expect(operations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        fillStyle: '#22c55e',
        kind: 'fill',
      }),
      expect.objectContaining({
        globalAlpha: 1,
        kind: 'stroke',
        lineWidth: 2,
        strokeStyle: '#60a5fa',
      }),
    ]));
  });

  it('uses edge decoration styling when one is present', () => {
    const { ctx, operations } = createContext();

    renderBidirectionalLink(
      createDependencies({
        edgeDecorations: {
          'src/app.ts->src/utils.ts': {
            color: '#facc15',
            opacity: 0.4,
            width: 4,
          },
        },
      }),
      createLink(),
      ctx,
      2,
    );

    expect(operations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        globalAlpha: 0.4,
        kind: 'stroke',
        lineWidth: 2,
        strokeStyle: '#facc15',
      }),
      expect.objectContaining({
        fillStyle: '#22c55e',
        kind: 'fill',
      }),
    ]));
  });

  it('keeps the connected stroke styling when the highlighted node is the source', () => {
    const { ctx, operations } = createContext();

    renderBidirectionalLink(
      createDependencies({
        highlightedNodeId: 'src/app.ts',
      }),
      createLink(),
      ctx,
      1,
    );

    expect(operations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        globalAlpha: 1,
        kind: 'stroke',
        lineWidth: 2,
        strokeStyle: '#60a5fa',
      }),
    ]));
  });

  it('keeps the connected stroke styling when the highlighted node is the target', () => {
    const { ctx, operations } = createContext();

    renderBidirectionalLink(
      createDependencies({
        highlightedNodeId: 'src/utils.ts',
      }),
      createLink(),
      ctx,
      1,
    );

    expect(operations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        globalAlpha: 1,
        kind: 'stroke',
        lineWidth: 2,
        strokeStyle: '#60a5fa',
      }),
    ]));
  });

  it('dims disconnected links with the light-theme default stroke color', () => {
    const { ctx, operations } = createContext();

    renderBidirectionalLink(
      createDependencies({
        highlightedNodeId: 'src/other.ts',
        theme: 'light',
      }),
      createLink(),
      ctx,
      1,
    );

    expect(operations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        globalAlpha: 0.15,
        kind: 'stroke',
        lineWidth: 2,
        strokeStyle: '#d4d4d4',
      }),
    ]));
  });

  it('dims disconnected links with the dark-theme default stroke color', () => {
    const { ctx, operations } = createContext();

    renderBidirectionalLink(
      createDependencies({
        highlightedNodeId: 'src/other.ts',
        theme: 'dark',
      }),
      createLink(),
      ctx,
      1,
    );

    expect(operations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        globalAlpha: 0.15,
        kind: 'stroke',
        lineWidth: 2,
        strokeStyle: '#2d3748',
      }),
    ]));
  });

  it('points the second arrow back toward the source node', () => {
    const { ctx } = createContext();

    renderBidirectionalLink(createDependencies(), createLink(), ctx, 1);

    expect(ctx.moveTo).toHaveBeenNthCalledWith(3, 10, 10);
    expect(ctx.lineTo).toHaveBeenNthCalledWith(5, 22, 13.75);
    expect(ctx.lineTo).toHaveBeenNthCalledWith(6, 12.4, 10);
    expect(ctx.lineTo).toHaveBeenNthCalledWith(7, 22, 6.25);
  });

  it('skips bidirectional canvas drawing when direction mode is not arrows', () => {
    const { ctx } = createContext();

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
    const { ctx } = createContext();

    renderBidirectionalLink(
      createDependencies(),
      createLink({
        source: { id: 'src/app.ts', x: 0, y: 10, size: 10 } as unknown as FGLink['source'],
        target: { id: 'src/utils.ts', x: 15, y: 10, size: 10 } as unknown as FGLink['target'],
      }),
      ctx,
      1,
    );

    expect(ctx.stroke).not.toHaveBeenCalled();
    expect(ctx.fill).not.toHaveBeenCalled();
  });
});
