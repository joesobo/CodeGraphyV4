import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_DIRECTION_COLOR } from '../../../../src/shared/fileColors';
import type { EdgeDecorationPayload } from '../../../../src/shared/plugins/decorations';
import type { DirectionMode } from '../../../../src/shared/settings/modes';
import type { ThemeKind } from '../../../../src/webview/theme/useTheme';
import type { FGLink } from '../../../../src/webview/components/graph/model/build';
import {
  getGraphDirectionalColor,
  getGraphLinkColor,
} from '../../../../src/webview/components/graph/rendering/link/colors';
import {
  getGraphArrowRelPos,
  getGraphLinkParticles,
  getGraphLinkWidth,
  getLinkCanvasObjectMode,
} from '../../../../src/webview/components/graph/rendering/link/metrics';
import { renderBidirectionalLink } from '../../../../src/webview/components/graph/rendering/bidirectional/link';

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

describe('graph/rendering/link/links', () => {
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

  it('prefers edge decoration color over the link base color', () => {
    const color = getGraphLinkColor(
      createDependencies({
        edgeDecorations: {
          'src/app.ts->src/utils.ts': { color: '#f97316' },
        },
      }),
      createLink({ baseColor: '#3b82f6' }),
    );

    expect(color).toBe('#f97316');
  });

  it('uses the highlight color for links connected to the highlighted node', () => {
    const color = getGraphLinkColor(
      createDependencies({ highlightedNodeId: 'src/app.ts' }),
      createLink(),
    );

    expect(color).toBe('#60a5fa');
  });

  it('falls back to the default direction color when no base color is present', () => {
    const color = getGraphLinkColor(createDependencies(), createLink({ baseColor: undefined }));

    expect(color).toBe(DEFAULT_DIRECTION_COLOR);
  });

  it('reads particle counts from edge decorations before falling back to the default', () => {
    const decoratedCount = getGraphLinkParticles(
      createDependencies({
        edgeDecorations: {
          'src/app.ts->src/utils.ts': { particles: { count: 8 } },
        },
      }),
      createLink(),
    );
    const defaultCount = getGraphLinkParticles(createDependencies(), createLink());

    expect(decoratedCount).toBe(8);
    expect(defaultCount).toBe(3);
  });

  it('returns an arrow relative position of 1 so arrows end at the node border', () => {
    expect(getGraphArrowRelPos()).toBe(1);
  });

  it('normalizes invalid direction colors back to the default direction color', () => {
    const color = getGraphDirectionalColor(
      createDependencies({ directionColor: 'not-a-hex-color' }),
    );

    expect(color).toBe(DEFAULT_DIRECTION_COLOR);
  });

  it('uses edge decoration widths before falling back to highlight-based widths', () => {
    const decoratedWidth = getGraphLinkWidth(
      createDependencies({
        edgeDecorations: {
          'src/app.ts->src/utils.ts': { width: 5 },
        },
      }),
      createLink(),
    );
    const highlightedWidth = getGraphLinkWidth(
      createDependencies({ highlightedNodeId: 'src/utils.ts' }),
      createLink(),
    );
    const defaultWidth = getGraphLinkWidth(createDependencies(), createLink({ bidirectional: false }));

    expect(decoratedWidth).toBe(5);
    expect(highlightedWidth).toBe(2);
    expect(defaultWidth).toBe(1);
  });

  it('uses replace mode only for bidirectional links in arrows mode', () => {
    const replaceMode = getLinkCanvasObjectMode('arrows', createLink());
    const afterMode = getLinkCanvasObjectMode('particles', createLink());

    expect(replaceMode).toBe('replace');
    expect(afterMode).toBe('after');
  });
});
