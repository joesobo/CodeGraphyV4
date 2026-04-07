import { describe, expect, it } from 'vitest';
import type { IGraphData } from '@codegraphy-vscode/plugin-api';
import { buildUndirectedAdjacencyList, walkDepthFromNode } from '../src/focusedImports/traversal';

describe('focusedImports/traversal', () => {
  it('builds a bidirectional adjacency list from graph edges', () => {
    const graphData: IGraphData = {
      nodes: [
        { id: 'a.ts', label: 'a.ts', color: '#fff' },
        { id: 'b.ts', label: 'b.ts', color: '#fff' },
        { id: 'c.ts', label: 'c.ts', color: '#fff' },
      ],
      edges: [
        { id: 'a->b#import', from: 'a.ts', to: 'b.ts', kind: 'import', sources: [] },
        { id: 'b->c#import', from: 'b.ts', to: 'c.ts', kind: 'import', sources: [] },
      ],
    };

    const adjacencyList = buildUndirectedAdjacencyList(graphData);

    expect([...adjacencyList.get('a.ts') ?? []]).toEqual(['b.ts']);
    expect([...adjacencyList.get('b.ts') ?? []]).toEqual(['a.ts', 'c.ts']);
    expect([...adjacencyList.get('c.ts') ?? []]).toEqual(['b.ts']);
  });

  it('walks breadth-first up to the depth limit and ignores missing roots', () => {
    const adjacencyList = new Map<string, Set<string>>([
      ['a.ts', new Set(['b.ts'])],
      ['b.ts', new Set(['a.ts', 'c.ts'])],
      ['c.ts', new Set(['b.ts'])],
    ]);

    expect(walkDepthFromNode('a.ts', 1, adjacencyList)).toEqual(new Map([
      ['a.ts', 0],
      ['b.ts', 1],
    ]));
    expect(walkDepthFromNode('missing.ts', 2, adjacencyList)).toEqual(new Map());
  });
});
