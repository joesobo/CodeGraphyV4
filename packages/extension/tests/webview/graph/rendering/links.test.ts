import { describe, expect, it } from 'vitest';
import { DEFAULT_DIRECTION_COLOR } from '../../../../src/shared/fileColors';
import type { EdgeDecorationPayload } from '../../../../src/shared/plugins/decorations';
import type { FGLink } from '../../../../src/webview/components/graph/model/build';
import { DEFAULT_GRAPH_APPEARANCE, type GraphAppearance } from '../../../../src/webview/components/graph/appearance/model';
import {
  getGraphDirectionalColor,
  getGraphLinkColor,
} from '../../../../src/webview/components/graph/rendering/link/colors/model';
import {
  getGraphLinkParticles,
  getGraphLinkWidth,
} from '../../../../src/webview/components/graph/rendering/link/metrics';

const TEST_GRAPH_APPEARANCE: GraphAppearance = {
  ...DEFAULT_GRAPH_APPEARANCE,
  linkHighlight: '#60a5fa',
  linkMuted: '#8b949e',
};

function createDependencies(overrides: Partial<{
  directionColor: string;
  edgeDecorations: Record<string, EdgeDecorationPayload> | undefined;
  graphAppearance: GraphAppearance;
  highlightedNodeId: string | null;
}> = {}) {
  return {
    directionColorRef: { current: overrides.directionColor ?? '#22c55e' },
    edgeDecorationsRef: { current: overrides.edgeDecorations },
    graphAppearanceRef: { current: overrides.graphAppearance ?? TEST_GRAPH_APPEARANCE },
    highlightedNodeRef: { current: overrides.highlightedNodeId ?? null },
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

describe('graph/rendering/link/links', () => {
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
});
