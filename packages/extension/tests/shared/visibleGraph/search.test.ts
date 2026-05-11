import { describe, expect, it } from 'vitest';
import type { IGraphData, IGraphEdge, IGraphNode } from '../../../src/shared/graph/contracts';
import { applySearch } from '../../../src/shared/visibleGraph/search';

function node(id: string, label = id): IGraphNode {
  return {
    id,
    label,
    color: '#111111',
    nodeType: 'file',
  };
}

function edge(from: string, to: string): IGraphEdge {
  return {
    id: `${from}->${to}`,
    from,
    to,
    kind: 'import',
    sources: [],
  };
}

function graphData(): IGraphData {
  return {
    nodes: [
      node('src/FooPanel.tsx', 'Foo Panel'),
      node('src/foo-model.ts', 'foo model'),
      node('src/bar.ts', 'Bar'),
    ],
    edges: [
      edge('src/FooPanel.tsx', 'src/foo-model.ts'),
      edge('src/foo-model.ts', 'src/bar.ts'),
    ],
  };
}

describe('shared/visibleGraph/search/applySearch', () => {
  it('returns the original graph for whitespace-only queries', () => {
    const source = graphData();
    const result = applySearch(source, { query: '   ' });

    expect(result.graphData).toBe(source);
    expect(result.regexError).toBeNull();
  });

  it('matches node labels and paths case-insensitively by default', () => {
    const result = applySearch(graphData(), { query: 'foo' });

    expect(result.regexError).toBeNull();
    expect(result.graphData.nodes.map((item) => item.id)).toEqual([
      'src/FooPanel.tsx',
      'src/foo-model.ts',
    ]);
    expect(result.graphData.edges.map((item) => item.id)).toEqual([
      'src/FooPanel.tsx->src/foo-model.ts',
    ]);
  });

  it('respects case-sensitive matching', () => {
    const result = applySearch(graphData(), {
      query: 'Foo',
      options: { matchCase: true },
    });

    expect(result.graphData.nodes.map((item) => item.id)).toEqual(['src/FooPanel.tsx']);
  });

  it('supports whole-word literal search', () => {
    const result = applySearch(graphData(), {
      query: 'model',
      options: { wholeWord: true },
    });

    expect(result.graphData.nodes.map((item) => item.id)).toEqual([
      'src/foo-model.ts',
    ]);
  });

  it('matches symbol metadata such as signature and plugin kind', () => {
    const result = applySearch(
      {
        nodes: [
          {
            ...node('src/player.gd#Player:class', 'Player'),
            nodeType: 'symbol',
            symbol: {
              id: 'src/player.gd#Player:class',
              name: 'Player',
              kind: 'class',
              pluginKind: 'godot-class-name',
              signature: 'class_name Player',
              filePath: 'src/player.gd',
            },
          },
          node('src/enemy.gd', 'Enemy'),
        ],
        edges: [],
      },
      { query: 'godot-class-name' },
    );

    expect(result.regexError).toBeNull();
    expect(result.graphData.nodes.map((item) => item.id)).toEqual([
      'src/player.gd#Player:class',
    ]);
  });

  it('returns regex errors with an empty visible graph', () => {
    const result = applySearch(graphData(), {
      query: '[',
      options: { regex: true },
    });

    expect(result.graphData).toEqual({ nodes: [], edges: [] });
    expect(result.regexError).toMatch(/Invalid regular expression/);
  });
});
