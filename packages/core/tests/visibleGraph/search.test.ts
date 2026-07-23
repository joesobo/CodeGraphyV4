import { describe, expect, it } from 'vitest';
import type { IGraphData, IGraphEdge, IGraphNode } from '../../src/graph/contracts';
import { applySearch } from '../../src/visibleGraph/search';

function node(id: string, label = id, symbol?: IGraphNode['symbol']): IGraphNode {
  return {
    id,
    label,
    ...(symbol ? { symbol } : {}),
  };
}

function edge(from: string, to: string): IGraphEdge {
  return {
    id: `${from}->${to}#reference`,
    from,
    to,
    kind: 'reference',
    sources: [],
  };
}

describe('visibleGraph/search', () => {
  it('leaves the graph untouched for blank queries', () => {
    const graphData: IGraphData = {
      nodes: [node('src/app.ts')],
      edges: [],
    };

    expect(applySearch(graphData, { query: '   ' })).toEqual({
      graphData,
      regexError: null,
    });
  });

  it('filters nodes and edges by node and symbol search text', () => {
    const graphData: IGraphData = {
      nodes: [
        node('src/user.ts', 'User model', {
          id: 'symbol:User',
          name: 'User',
          kind: 'class',
          pluginKind: 'class_declaration',
          signature: 'class User',
          filePath: 'src/user.ts',
          language: 'typescript',
          source: 'tree-sitter',
        }),
        node('src/repo.ts', 'Repository'),
        node('src/other.ts', 'Other'),
      ],
      edges: [
        edge('src/user.ts', 'src/repo.ts'),
        edge('src/user.ts', 'src/other.ts'),
      ],
    };

    expect(applySearch(graphData, { query: 'repository' })).toEqual({
      graphData: {
        nodes: [node('src/repo.ts', 'Repository')],
        edges: [],
      },
      regexError: null,
    });
    expect(applySearch(graphData, { query: 'TREE-SITTER' }).graphData.nodes).toEqual([
      graphData.nodes[0],
    ]);
  });

  it('reports regex errors and returns an empty graph', () => {
    const graphData: IGraphData = {
      nodes: [node('src/app.ts')],
      edges: [],
    };

    const result = applySearch(graphData, {
      query: '[',
      options: { regex: true },
    });

    expect(result.graphData).toEqual({ nodes: [], edges: [] });
    expect(result.regexError).toContain('Invalid regular expression');
  });
});
