import { describe, expect, expectTypeOf, it } from 'vitest';
import type { IGraphData, IGraphEdge, IGraphNode } from '../../src/graph/contracts';
import type { VisibleGraphConfig } from '../../src/visibleGraph/contracts';
import { deriveVisibleGraph } from '../../src/visibleGraph/derive';

function node(id: string, nodeType?: IGraphNode['nodeType']): IGraphNode {
  return {
    id,
    label: id,
    ...(nodeType ? { nodeType } : {}),
  };
}

function edge(from: string, to: string, kind: IGraphEdge['kind']): IGraphEdge {
  return {
    id: `${from}->${to}#${kind}`,
    from,
    to,
    kind,
    sources: [],
  };
}

describe('visibleGraph/derive', () => {
  it('does not accept interface-owned collapse state', () => {
    type CoreCollapseKey = Extract<keyof VisibleGraphConfig, 'collapse'>;

    expectTypeOf<CoreCollapseKey>().toEqualTypeOf<never>();
  });

  it('returns an empty result when no graph data is available', () => {
    expect(deriveVisibleGraph(null)).toEqual({
      graphData: null,
      regexError: null,
    });
  });

  it('returns the original graph when no optional projections are configured', () => {
    const graphData: IGraphData = {
      nodes: [
        node('src', 'folder'),
        node('src/app.ts'),
      ],
      edges: [],
    };

    expect(deriveVisibleGraph(graphData)).toEqual({
      graphData,
      regexError: null,
    });
  });

  it('applies scope projection when configured', () => {
    const graphData: IGraphData = {
      nodes: [
        node('src/app.ts'),
        node('src/consumer.ts'),
      ],
      edges: [
        edge('src/app.ts', 'src/consumer.ts', 'import'),
      ],
    };

    expect(deriveVisibleGraph(graphData, {
      scope: {
        nodes: [],
        edges: [
          { type: 'import', enabled: false },
        ],
      },
    })).toEqual({
      graphData: {
        nodes: [
          node('src/app.ts'),
          node('src/consumer.ts'),
        ],
        edges: [],
      },
      regexError: null,
    });
  });

  it('applies filter projection when configured', () => {
    const graphData: IGraphData = {
      nodes: [
        node('src/app.ts'),
        node('src/generated.ts'),
      ],
      edges: [
        edge('src/app.ts', 'src/generated.ts', 'import'),
      ],
    };

    expect(deriveVisibleGraph(graphData, {
      filter: { patterns: ['src/generated.ts'] },
    })).toEqual({
      graphData: {
        nodes: [
          node('src/app.ts'),
        ],
        edges: [],
      },
      regexError: null,
    });
  });

  it('applies search projection and returns regex errors when configured', () => {
    const graphData: IGraphData = {
      nodes: [node('src/app.ts')],
      edges: [],
    };

    const result = deriveVisibleGraph(graphData, {
      search: {
        query: '[',
        options: { regex: true },
      },
    });

    expect(result.graphData).toEqual({ nodes: [], edges: [] });
    expect(result.regexError).toContain('Invalid regular expression');
  });

  it('applies explicit orphan visibility when configured', () => {
    const graphData: IGraphData = {
      nodes: [
        node('src/app.ts'),
        node('src/orphan.ts'),
      ],
      edges: [],
    };

    expect(deriveVisibleGraph(graphData, {
      showOrphans: false,
    })).toEqual({
      graphData: {
        nodes: [],
        edges: [],
      },
      regexError: null,
    });
  });

  it('applies scope, filter, search, and orphan projections in order', () => {
    const graphData: IGraphData = {
      nodes: [
        node('src', 'folder'),
        node('src/app.ts'),
        node('src/keep.ts'),
        node('src/generated.ts'),
        node('src/orphan.ts'),
      ],
      edges: [
        edge('src/app.ts', 'src/keep.ts', 'reference'),
        edge('src/app.ts', 'src/generated.ts', 'import'),
      ],
    };

    const result = deriveVisibleGraph(graphData, {
      scope: {
        nodes: [
          { type: 'folder', enabled: true },
        ],
        edges: [
          { type: 'import', enabled: false },
        ],
      },
      filter: { patterns: ['src/generated.ts'] },
      search: { query: 'src' },
      showOrphans: false,
    });

    expect(result.graphData.nodes.map(candidate => candidate.id)).toEqual([
      'src',
      'src/app.ts',
      'src/keep.ts',
      'src/orphan.ts',
    ]);
    expect(result.regexError).toBeNull();
  });
});
