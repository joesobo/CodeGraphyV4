import { describe, expect, it } from 'vitest';
import type { EdgeDecorationPayload } from '../../../../../../src/shared/plugins/decorations';
import { DEFAULT_GRAPH_APPEARANCE } from '../../../../../../src/webview/components/graph/appearance/model';
import type { FGLink } from '../../../../../../src/webview/components/graph/model/build';
import {
  getGraphLinkColor
} from '../../../../../../src/webview/components/graph/rendering/link/colors/model';

function createDependencies(overrides: Partial<{
  directionColor: string;
  edgeDecorations: Record<string, EdgeDecorationPayload> | undefined;
  highlightedNodeId: string | null;
  linkHighlight: string;
  linkMuted: string;
}> = {}) {
  return {
    directionColorRef: { current: overrides.directionColor ?? '#22c55e' },
    edgeDecorationsRef: { current: overrides.edgeDecorations },
    highlightedNodeRef: { current: overrides.highlightedNodeId ?? null },
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



    it('uses the provided muted link color when the highlighted node is unrelated', () => {
      const color = getGraphLinkColor(
        createDependencies({
          highlightedNodeId: 'src/other.ts',
          linkMuted: '#e2e8f0',
        }),
        createLink(),
      );

      expect(color).toBe('#e2e8f0');
    });



    it('uses the default muted link color when the highlighted node is unrelated', () => {
      const color = getGraphLinkColor(
        createDependencies({ highlightedNodeId: 'src/other.ts' }),
        createLink(),
      );

      expect(color).toBe('#2d3748');
    });
});
