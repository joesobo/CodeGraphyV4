import { describe, expect, it } from 'vitest';
import {
  createDiffGraphSnapshot,
  filterDanglingDiffGraphEdges,
} from '../../../src/extension/gitHistory/diffGraphSnapshot';

describe('gitHistory/diffGraphSnapshot', () => {
  it('clones the previous graph into mutable lookup structures', () => {
    const previousGraph = {
      nodes: [{ id: 'src/a.ts', label: 'a.ts', color: '#fff' }],
      edges: [{ id: 'src/a.ts->src/b.ts', from: 'src/a.ts', to: 'src/b.ts' }],
    };

    const snapshot = createDiffGraphSnapshot(previousGraph);

    expect(snapshot.nodes).toEqual(previousGraph.nodes);
    expect(snapshot.edges).toEqual(previousGraph.edges);
    expect(snapshot.nodes).not.toBe(previousGraph.nodes);
    expect(snapshot.edges).not.toBe(previousGraph.edges);
    expect(snapshot.nodeMap.get('src/a.ts')).toEqual(previousGraph.nodes[0]);
    expect(snapshot.edgeSet.has('src/a.ts->src/b.ts')).toBe(true);
  });

  it('filters edges whose endpoints are no longer present in the node list', () => {
    const nodes = [{ id: 'src/a.ts', label: 'a.ts', color: '#fff' }];
    const edges = [
      { id: 'keep', from: 'src/a.ts', to: 'src/a.ts' },
      { id: 'drop', from: 'src/a.ts', to: 'src/b.ts' },
    ];

    expect(filterDanglingDiffGraphEdges(nodes, edges)).toEqual([
      { id: 'keep', from: 'src/a.ts', to: 'src/a.ts' },
    ]);
  });
});
