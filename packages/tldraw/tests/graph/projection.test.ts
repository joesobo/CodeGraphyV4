import type { IGraphData } from '@codegraphy-dev/core';
import { describe, expect, it } from 'vitest';
import { projectDefaultFileGraph } from '../../src/graph/projection';

describe('projectDefaultFileGraph', () => {
  it('keeps file nodes and Core-default relationship kinds', () => {
    const graph = {
      nodes: [
        { id: 'src/a.ts', label: 'a.ts', color: '#111111', nodeType: 'file' },
        { id: 'src/b.ts', label: 'b.ts', color: '#222222', nodeType: 'file' },
        { id: 'src', label: 'src', color: '#333333', nodeType: 'folder' },
        { id: 'symbol:a', label: 'a', color: '#444444', nodeType: 'function' },
      ],
      edges: [
        { id: 'import', from: 'src/a.ts', to: 'src/b.ts', kind: 'import', sources: [] },
        { id: 'call', from: 'src/a.ts', to: 'src/b.ts', kind: 'call', sources: [] },
        { id: 'nest', from: 'src', to: 'src/a.ts', kind: 'nests', sources: [] },
      ],
    } satisfies IGraphData;

    expect(projectDefaultFileGraph(graph)).toEqual({
      nodes: graph.nodes.slice(0, 2),
      edges: [graph.edges[0]],
    });
  });
});
