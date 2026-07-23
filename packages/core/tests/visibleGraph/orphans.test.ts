import { describe, expect, it } from 'vitest';
import type { IGraphData, IGraphEdge, IGraphNode } from '../../src/graph/contracts';
import { applyShowOrphans } from '../../src/visibleGraph/orphans';

function node(id: string): IGraphNode {
  return {
    id,
    label: id,
  };
}

function edge(from: string, to: string): IGraphEdge {
  return {
    id: `${from}->${to}#import`,
    from,
    to,
    kind: 'import',
    sources: [],
  };
}

describe('visibleGraph/orphans', () => {
  it('returns the original graph when orphans remain visible', () => {
    const graphData: IGraphData = {
      nodes: [node('src/a.ts')],
      edges: [],
    };

    expect(applyShowOrphans(graphData, true)).toBe(graphData);
  });

  it('removes orphan nodes and dangling edges when orphans are hidden', () => {
    const graphData: IGraphData = {
      nodes: [
        node('src/a.ts'),
        node('src/b.ts'),
        node('src/orphan.ts'),
      ],
      edges: [
        edge('src/a.ts', 'src/b.ts'),
        edge('src/a.ts', 'src/missing.ts'),
      ],
    };

    expect(applyShowOrphans(graphData, false)).toEqual({
      nodes: [
        node('src/a.ts'),
        node('src/b.ts'),
      ],
      edges: [
        edge('src/a.ts', 'src/b.ts'),
      ],
    });
  });
});
