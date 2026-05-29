import { describe, expect, it } from 'vitest';
import { DEFAULT_DIRECTION_COLOR } from '../../../../../../src/shared/fileColors';
import type { EdgeDecorationPayload } from '../../../../../../src/shared/plugins/decorations';
import type { DirectionMode } from '../../../../../../src/shared/settings/modes';
import { DEFAULT_GRAPH_APPEARANCE } from '../../../../../../src/webview/components/graph/appearance/model';
import type { FGLink } from '../../../../../../src/webview/components/graph/model/build';
import {
  getGraphDirectionalColor,
  getGraphLinkColor,
} from '../../../../../../src/webview/components/graph/rendering/link/colors/model';
import type { ThemeKind } from '../../../../../../src/webview/theme/useTheme';

function createDependencies(overrides: Partial<{
  directionColor: string;
  directionMode: DirectionMode;
  edgeDecorations: Record<string, EdgeDecorationPayload> | undefined;
  highlightedNodeId: string | null;
  linkHighlight: string;
  linkMuted: string;
  theme: ThemeKind;
}> = {}) {
  return {
    directionColorRef: { current: overrides.directionColor ?? '#22c55e' },
    directionModeRef: { current: overrides.directionMode ?? 'arrows' },
    edgeDecorationsRef: { current: overrides.edgeDecorations },
    highlightedNodeRef: { current: overrides.highlightedNodeId ?? null },
    themeRef: { current: overrides.theme ?? 'dark' },
    graphAppearanceRef: {
      current: {
        ...DEFAULT_GRAPH_APPEARANCE,
        linkHighlight: overrides.linkHighlight ?? '#60a5fa',
        linkMuted: overrides.linkMuted ?? '#2d3748',
      },
    },
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


    it('uses the muted link color independent of the detected theme kind', () => {
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



    it('keeps resolved theme rgb direction colors', () => {
      const color = getGraphDirectionalColor(
        createDependencies({ directionColor: 'rgb(172, 157, 87)' }),
      );

      expect(color).toBe('rgb(172, 157, 87)');
    });



    it('normalizes invalid direction colors back to the default direction color', () => {
      const color = getGraphDirectionalColor(
        createDependencies({ directionColor: 'not-a-hex-color' }),
      );

      expect(color).toBe(DEFAULT_DIRECTION_COLOR);
    });
});
