import { describe, expect, it } from 'vitest';
import type { EdgeDecorationPayload } from '../../../../../src/shared/plugins/decorations';
import type { FGLink } from '../../../../../src/webview/components/graph/model/build';
import {
  getGraphLinkOpacity,
  getGraphLinkParticles,
  getGraphLinkWidth,
} from '../../../../../src/webview/components/graph/rendering/link/metrics';

function createDependencies(overrides: Partial<{
  directionColor: string;
  edgeDecorations: Record<string, EdgeDecorationPayload> | undefined;
  highlightedNodeId: string | null;
}> = {}) {
  return {
    directionColorRef: { current: overrides.directionColor ?? '#22c55e' },
    edgeDecorationsRef: { current: overrides.edgeDecorations },
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

describe('graph/rendering/link/metrics', () => {
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

  it('falls back to the default particle count when a decoration omits particle settings', () => {
    const count = getGraphLinkParticles(
      createDependencies({
        edgeDecorations: {
          'src/app.ts->src/utils.ts': {},
        },
      }),
      createLink(),
    );

    expect(count).toBe(3);
  });

  it('preserves a zero particle count from edge decorations', () => {
    const count = getGraphLinkParticles(
      createDependencies({
        edgeDecorations: {
          'src/app.ts->src/utils.ts': { particles: { count: 0 } },
        },
      }),
      createLink(),
    );

    expect(count).toBe(0);
  });

  it('dims ordinary edges while preserving decoration and highlight emphasis', () => {
    const decoratedOpacity = getGraphLinkOpacity(
      createDependencies({
        edgeDecorations: {
          'src/app.ts->src/utils.ts': { opacity: 0.6 },
        },
      }),
      createLink(),
    );
    const ordinaryOpacity = getGraphLinkOpacity(createDependencies(), createLink());
    const connectedOpacity = getGraphLinkOpacity(
      createDependencies({ highlightedNodeId: 'src/app.ts' }),
      createLink(),
    );
    const unrelatedOpacity = getGraphLinkOpacity(
      createDependencies({ highlightedNodeId: 'src/other.ts' }),
      createLink(),
    );

    expect(decoratedOpacity).toBe(0.6);
    expect(ordinaryOpacity).toBe(0.3);
    expect(connectedOpacity).toBe(0.9);
    expect(unrelatedOpacity).toBe(0.12);
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

  it('preserves a zero edge decoration width', () => {
    const width = getGraphLinkWidth(
      createDependencies({
        edgeDecorations: {
          'src/app.ts->src/utils.ts': { width: 0 },
        },
      }),
      createLink({ bidirectional: true }),
    );

    expect(width).toBe(0);
  });

  it('treats string endpoints as connected when the highlighted node id matches', () => {
    const width = getGraphLinkWidth(
      createDependencies({ highlightedNodeId: 'src/app.ts' }),
      createLink({
        source: 'src/app.ts',
        target: 'src/utils.ts',
      }),
    );

    expect(width).toBe(2);
  });

  it('treats object endpoints as connected when the highlighted node id matches the source', () => {
    const width = getGraphLinkWidth(
      createDependencies({ highlightedNodeId: 'src/app.ts' }),
      createLink(),
    );

    expect(width).toBe(2);
  });

  it('uses a hairline width for ordinary bidirectional edges', () => {
    const width = getGraphLinkWidth(createDependencies(), createLink({ bidirectional: true }));

    expect(width).toBe(1);
  });

  it('uses the thin default width when a highlighted node is unrelated to the link', () => {
    const width = getGraphLinkWidth(
      createDependencies({ highlightedNodeId: 'src/other.ts' }),
      createLink({
        source: 'src/app.ts',
        target: 'src/utils.ts',
      }),
    );

    expect(width).toBe(1);
  });
});
