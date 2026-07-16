import { describe, expect, it } from 'vitest';

import { computeConnectionSizes } from '../../../../../src/webview/components/graph/model/sizing/calculations';

function relatedGraph(relatedNodeCount: number) {
  const leaves = Array.from({ length: relatedNodeCount }, (_, index) => ({
    color: '#fff',
    id: `leaf-${index}.ts`,
    label: `leaf-${index}.ts`,
  }));
  return {
    edges: leaves.map((leaf, index) => index % 2 === 0
      ? { from: 'hub.ts', to: leaf.id }
      : { from: leaf.id, to: 'hub.ts' }),
    nodes: [{ id: 'hub.ts', label: 'hub.ts', color: '#fff' }, ...leaves],
  };
}

describe('computeConnectionSizes edge contracts', () => {
  it('counts unique incoming and outgoing related nodes', () => {
    const graph = relatedGraph(15);

    const sizes = computeConnectionSizes(graph.nodes, graph.edges);

    expect(sizes.get('hub.ts')).toBe(12);
    expect(sizes.get('leaf-0.ts')).toBe(8);
    expect(sizes.get('leaf-1.ts')).toBe(8);
  });

  it('ignores relationships whose other endpoint is absent from the visible graph', () => {
    const sizes = computeConnectionSizes(
      [{ id: 'visible.ts', label: 'visible.ts', color: '#fff' }],
      [{ from: 'visible.ts', to: 'hidden.ts' }],
    );

    expect(sizes.get('visible.ts')).toBe(8);
  });

  it('counts repeated self-relationships no more than once', () => {
    const sizes = computeConnectionSizes(
      [{ id: 'self.ts', label: 'self.ts', color: '#fff' }],
      [
        { from: 'self.ts', to: 'self.ts' },
        { from: 'self.ts', to: 'self.ts' },
      ],
    );

    expect(sizes.get('self.ts')).toBe(8);
  });

  it('uses the exact square-root curve between its bounds', () => {
    const graph = relatedGraph(40);

    const sizes = computeConnectionSizes(graph.nodes, graph.edges);

    expect(sizes.get('hub.ts')).toBeCloseTo(3 * Math.sqrt(41));
  });

  it('caps the square-root curve at 30', () => {
    const graph = relatedGraph(150);

    expect(computeConnectionSizes(graph.nodes, graph.edges).get('hub.ts')).toBe(30);
  });
});
