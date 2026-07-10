import { describe, expect, it } from 'vitest';

import type { IGraphData, IGraphNode } from '../../../../../src/shared/graph/contracts';
import { projectGraphForRendering } from '../../../../../src/webview/components/graph/rendering/projection/model';

function node(id: string, nodeType: IGraphNode['nodeType']): IGraphNode {
  return { id, label: id, color: '#fff', nodeType };
}

describe('graph/rendering/projection/model', () => {
  it('preserves the full graph inside the detailed render budget', () => {
    const graph: IGraphData = {
      nodes: [node('src/app.ts', 'file'), node('src/app.ts#run', 'symbol')],
      edges: [],
    };

    expect(projectGraphForRendering(graph, 2)).toBe(graph);
  });

  it('projects oversized evidence to an interactive file overview', () => {
    const graph: IGraphData = {
      nodes: [
        node('src/app.ts', 'file'),
        node('src/lib.ts', 'file'),
        node('src/app.ts#run', 'symbol'),
      ],
      edges: [
        {
          id: 'imports',
          from: 'src/app.ts',
          to: 'src/lib.ts',
          kind: 'import',
          sources: [],
        },
        {
          id: 'contains',
          from: 'src/app.ts',
          to: 'src/app.ts#run',
          kind: 'contains',
          sources: [],
        },
      ],
    };

    expect(projectGraphForRendering(graph, 2)).toEqual({
      nodes: [graph.nodes[0], graph.nodes[1]],
      edges: [graph.edges[0]],
    });
  });
});
