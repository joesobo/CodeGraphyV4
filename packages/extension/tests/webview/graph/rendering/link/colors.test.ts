import { describe, expect, it } from 'vitest';
import { DEFAULT_DIRECTION_COLOR } from '../../../../../src/shared/fileColors';
import type { EdgeDecorationPayload } from '../../../../../src/shared/plugins/decorations';
import type { DirectionMode } from '../../../../../src/shared/settings/modes';
import type { ThemeKind } from '../../../../../src/webview/theme/useTheme';
import type { FGLink } from '../../../../../src/webview/components/graph/model/build';
import {
  getGraphDirectionalColor,
  getGraphLinkColor,
} from '../../../../../src/webview/components/graph/rendering/link/colors';

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

describe('graph/rendering/link/colors', () => {
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

  it('uses the link base color when nothing is highlighted', () => {
    const color = getGraphLinkColor(
      createDependencies(),
      createLink({ baseColor: '#3b82f6' }),
    );

    expect(color).toBe('#3b82f6');
  });

  it('uses the highlight color for links connected to the highlighted node', () => {
    const color = getGraphLinkColor(
      createDependencies({ highlightedNodeId: 'src/app.ts' }),
      createLink(),
    );

    expect(color).toBe('#60a5fa');
  });

  it('treats object endpoints as connected when the highlighted node matches the source', () => {
    const color = getGraphLinkColor(
      createDependencies({ highlightedNodeId: 'src/app.ts' }),
      createLink(),
    );

    expect(color).toBe('#60a5fa');
  });

  it('treats string endpoints as connected when the highlighted node matches the target', () => {
    const color = getGraphLinkColor(
      createDependencies({ highlightedNodeId: 'src/utils.ts' }),
      createLink({
        source: 'src/app.ts',
        target: 'src/utils.ts',
      }),
    );

    expect(color).toBe('#60a5fa');
  });

  it('uses the light-theme disconnected color when the highlighted node is unrelated', () => {
    const color = getGraphLinkColor(
      createDependencies({
        highlightedNodeId: 'src/other.ts',
        theme: 'light',
      }),
      createLink(),
    );

    expect(color).toBe('#e2e8f0');
  });

  it('uses the dark-theme disconnected color when the highlighted node is unrelated', () => {
    const color = getGraphLinkColor(
      createDependencies({
        highlightedNodeId: 'src/other.ts',
        theme: 'dark',
      }),
      createLink(),
    );

    expect(color).toBe('#2d3748');
  });

  it('uses the dark disconnected color for high-contrast themes', () => {
    const color = getGraphLinkColor(
      createDependencies({
        highlightedNodeId: 'src/other.ts',
        theme: 'high-contrast',
      }),
      createLink(),
    );

    expect(color).toBe('#2d3748');
  });

  it('falls back to the default direction color when no base color is present', () => {
    const color = getGraphLinkColor(createDependencies(), createLink({ baseColor: undefined }));

    expect(color).toBe(DEFAULT_DIRECTION_COLOR);
  });

  it('keeps valid direction colors unchanged', () => {
    const color = getGraphDirectionalColor(
      createDependencies({ directionColor: '#f97316' }),
    );

    expect(color).toBe('#f97316');
  });

  it('normalizes invalid direction colors back to the default direction color', () => {
    const color = getGraphDirectionalColor(
      createDependencies({ directionColor: 'not-a-hex-color' }),
    );

    expect(color).toBe(DEFAULT_DIRECTION_COLOR);
  });
});
