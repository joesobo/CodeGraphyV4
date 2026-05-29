import { describe, expect, it } from 'vitest';
import { buildGraphTooltipContext } from '../../../../src/webview/components/graph/tooltip/context';

describe('graph/tooltip/context', () => {
  it('uses the snapshot node and returns connected neighbors and edges', () => {
    const context = buildGraphTooltipContext({
      node: { id: 'src/app.ts', label: 'hovered.ts', color: '#000000' },
      snapshot: {
        nodes: [
          { id: 'src/app.ts', label: 'app.ts', color: '#93C5FD' },
          { id: 'src/utils.ts', label: 'utils.ts', color: '#67E8F9' },
          { id: 'src/other.ts', label: 'other.ts', color: '#FCA5A5' },
        ],
        edges: [
          { id: 'app-utils', from: 'src/app.ts', to: 'src/utils.ts', kind: 'import', sources: [] },
          { id: 'other-app', from: 'src/other.ts', to: 'src/app.ts', kind: 'import', sources: [] },
        ],
      },
    });

    expect(context.node).toEqual({ id: 'src/app.ts', label: 'app.ts', color: '#93C5FD' });
    expect(context.neighbors.map(node => node.id)).toEqual(['src/utils.ts', 'src/other.ts']);
    expect(context.edges.map(edge => edge.id)).toEqual(['app-utils', 'other-app']);
  });

  it('falls back to the hovered node when the snapshot does not contain it', () => {
    expect(buildGraphTooltipContext({
      node: { id: 'missing.ts', label: 'missing.ts', color: '#CBD5E1' },
      snapshot: { nodes: [], edges: [] },
    })).toEqual({
      node: { id: 'missing.ts', label: 'missing.ts', color: '#CBD5E1' },
      neighbors: [],
      edges: [],
    });
  });
});
