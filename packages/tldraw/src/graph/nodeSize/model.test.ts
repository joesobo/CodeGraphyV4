import type { IGraphData } from '@codegraphy-dev/core';
import { describe, expect, it } from 'vitest';
import {
  createNodeDiameterMap,
  MAXIMUM_NODE_RADIUS,
  MINIMUM_NODE_RADIUS,
} from './model';

describe('connection-based tldraw node sizes', () => {
  it('uses the Extension bounded square-root range', () => {
    const leaves = Array.from({ length: 100 }, (_, index) => ({
      color: '#fff',
      id: `leaf-${index}.ts`,
      label: `leaf-${index}.ts`,
    }));
    const graph = {
      nodes: [
        { color: '#fff', id: 'hub.ts', label: 'hub.ts' },
        { color: '#fff', id: 'solo.ts', label: 'solo.ts' },
        ...leaves,
      ],
      edges: leaves.map((leaf, index) => ({
        from: 'hub.ts', id: `edge-${index}`, kind: 'import' as const, sources: [], to: leaf.id,
      })),
    } satisfies IGraphData;

    const diameters = createNodeDiameterMap(graph.nodes, graph.edges);

    expect(MINIMUM_NODE_RADIUS).toBe(8);
    expect(MAXIMUM_NODE_RADIUS).toBe(30);
    expect(diameters.get('solo.ts')).toBe(80);
    expect(diameters.get('hub.ts')).toBe(300);
  });

  it('counts each resolved neighbor once', () => {
    const nodes = [
      { color: '#fff', id: 'a.ts', label: 'a.ts' },
      { color: '#fff', id: 'b.ts', label: 'b.ts' },
    ];
    const edges = [
      { from: 'a.ts', to: 'b.ts' },
      { from: 'a.ts', to: 'b.ts' },
      { from: 'b.ts', to: 'a.ts' },
      { from: 'a.ts', to: 'missing.ts' },
    ];

    expect(createNodeDiameterMap(nodes, edges)).toEqual(new Map([
      ['a.ts', 80],
      ['b.ts', 80],
    ]));
  });
});
