import { describe, expect, it } from 'vitest';
import type { IGraphData, IGraphEdge } from '../../../../src/shared/graph/contracts';
import {
  createDiffGraphSnapshot,
  filterDanglingDiffGraphEdges,
} from '../../../../src/extension/gitHistory/diff/snapshot';

describe('gitHistory/diff/snapshot', () => {
  it('clones the previous graph into mutable lookup structures', () => {
    const previousGraph: IGraphData = {
      nodes: [{ id: 'src/a.ts', label: 'a.ts', color: '#fff' }],
      edges: [{ id: 'src/a.ts->src/b.ts#import', from: 'src/a.ts', to: 'src/b.ts' , kind: 'import', sources: [] }],
    };

    const snapshot = createDiffGraphSnapshot(previousGraph);

    expect(snapshot.nodes).toEqual(previousGraph.nodes);
    expect(snapshot.edges).toEqual(previousGraph.edges);
    expect(snapshot.nodes).not.toBe(previousGraph.nodes);
    expect(snapshot.edges).not.toBe(previousGraph.edges);
    expect(snapshot.nodeMap.get('src/a.ts')).toEqual(previousGraph.nodes[0]);
    expect(snapshot.edgeSet.has('src/a.ts->src/b.ts#import')).toBe(true);
  });

  it('filters edges whose endpoints are no longer present in the node list', () => {
    const nodes = [{ id: 'src/a.ts', label: 'a.ts', color: '#fff' }];
    const edges: IGraphEdge[] = [
      { id: 'keep', from: 'src/a.ts', to: 'src/a.ts' , kind: 'import', sources: [] },
      { id: 'drop', from: 'src/a.ts', to: 'src/b.ts' , kind: 'import', sources: [] },
    ];

    expect(filterDanglingDiffGraphEdges(nodes, edges)).toEqual([
      { id: 'keep', from: 'src/a.ts', to: 'src/a.ts' , kind: 'import', sources: [] },
    ]);
  });
});
