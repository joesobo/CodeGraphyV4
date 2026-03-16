import { describe, expect, it } from 'vitest';
import { DEFAULT_DIRECTION_COLOR, type DirectionMode, type EdgeDecorationPayload } from '../../../../src/shared/types';
import type { ThemeKind } from '../../../../src/webview/hooks/useTheme';
import type { FGLink } from '../../../../src/webview/components/graphModel';
import {
  getGraphDirectionalColor,
  getGraphLinkColor,
} from '../../../../src/webview/components/graph/rendering/linkColors';

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

describe('graph/rendering/linkColors', () => {
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

  it('normalizes invalid direction colors back to the default direction color', () => {
    const color = getGraphDirectionalColor(
      createDependencies({ directionColor: 'not-a-hex-color' }),
    );

    expect(color).toBe(DEFAULT_DIRECTION_COLOR);
  });
});
