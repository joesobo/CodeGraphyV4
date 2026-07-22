import { describe, expect, it } from 'vitest';
import type { IGraphData, IGraphEdge, IGraphNode } from '../../src/graph/contracts';
import { listGraphEdges, listGraphNodes } from '../../src/graphQuery';

function node(id: string, nodeType = 'file'): IGraphNode {
  return {
    id,
    label: id.split('/').pop() ?? id,
    color: '#111111',
    nodeType,
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

const graphData: IGraphData = {
  nodes: [
    node('packages/app/src/b.ts'),
    node('packages/app/src/a.ts'),
    node('packages/app/src/route', 'plugin-route'),
    node('packages/app/package.json'),
  ],
  edges: [
    edge('packages/app/src/a.ts', 'packages/app/src/b.ts', 'import'),
    edge('packages/app/src/a.ts', 'packages/app/src/b.ts', 'type-import'),
    edge('packages/app/src/route', 'packages/app/src/a.ts', 'reference'),
  ],
};

describe('core/graphQuery reports', () => {
  it('lists file nodes by default with deterministic pagination', () => {
    const result = listGraphNodes(graphData, { limit: 2 });

    expect(result).toEqual({
      nodes: [
        { path: 'packages/app/package.json', nodeType: 'file' },
        { path: 'packages/app/src/a.ts', nodeType: 'file' },
      ],
      page: {
        offset: 0,
        limit: 2,
        returned: 2,
        total: 3,
        nextOffset: 2,
      },
    });
  });

  it('includes structural folder nodes and nests edges when graph scope opts in', () => {
    const config = {
      scope: {
        nodes: { file: true, folder: true },
        edges: { nests: true },
      },
      sort: [{ by: 'path', direction: 'asc' as const }],
      limit: 100,
    };

    expect(listGraphNodes(graphData, config).nodes).toEqual(
      expect.arrayContaining([
        { path: 'packages/app/src', nodeType: 'folder' },
        { path: 'packages/app/src/a.ts', nodeType: 'file' },
      ]),
    );
    expect(listGraphEdges(graphData, config).edges).toEqual(
      expect.arrayContaining([
        {
          from: 'packages/app/src',
          to: 'packages/app/src/a.ts',
          edgeTypes: ['nests'],
        },
      ]),
    );
  });

  it('groups high-level edges by node pair with all edge types', () => {
    const result = listGraphEdges(graphData);

    expect(result.edges).toEqual([
      {
        from: 'packages/app/src/a.ts',
        to: 'packages/app/src/b.ts',
        edgeTypes: ['import', 'type-import'],
      },
    ]);
    expect(result.page).toEqual({
      offset: 0,
      limit: 500,
      returned: 1,
      total: 1,
      nextOffset: null,
    });
  });

  it('filters edges by exact endpoint and edge type before pagination', () => {
    const result = listGraphEdges(graphData, {
      filters: [
        { field: 'from', op: 'equals', value: 'packages/app/src/a.ts' },
        { field: 'to', op: 'equals', value: 'packages/app/src/b.ts' },
        { field: 'edgeTypes', op: 'includes', value: 'type-import' },
      ],
    });

    expect(result.edges).toEqual([
      {
        from: 'packages/app/src/a.ts',
        to: 'packages/app/src/b.ts',
        edgeTypes: ['type-import'],
      },
    ]);
  });

  it('applies direct connection arguments before grouping edge reports', () => {
    const result = listGraphEdges(graphData, {
      from: 'packages/app/src/a.ts',
      to: 'packages/app/src/b.ts',
      edgeType: 'type-import',
    });

    expect(result.edges).toEqual([{
      from: 'packages/app/src/a.ts',
      to: 'packages/app/src/b.ts',
      edgeTypes: ['type-import'],
    }]);
  });

  it('filters nodes by report fields before orphan handling', () => {
    const result = listGraphNodes(graphData, {
      scope: {
        nodes: { 'plugin-route': true },
      },
      filters: [
        { field: 'path', op: 'endsWith', value: 'route' },
        { field: 'nodeType', op: 'equals', value: 'plugin-route' },
        { field: 'unknown', op: 'equals', value: '' },
      ],
    });

    expect(result.nodes).toEqual([
      { path: 'packages/app/src/route', nodeType: 'plugin-route' },
    ]);
  });

  it('sorts edge reports by from and to fields by default', () => {
    const unorderedGraph: IGraphData = {
      nodes: [
        node('a.ts'),
        node('b.ts'),
        node('c.ts'),
      ],
      edges: [
        edge('b.ts', 'a.ts', 'reference'),
        edge('a.ts', 'c.ts', 'import'),
        edge('a.ts', 'b.ts', 'import'),
      ],
    };

    expect(listGraphEdges(unorderedGraph, {
      filters: [
        { field: 'edgeType', op: 'equals', value: 'import' },
        { field: 'unknown', op: 'equals', value: '' },
      ],
    }).edges).toEqual([
      { from: 'a.ts', to: 'b.ts', edgeTypes: ['import'] },
      { from: 'a.ts', to: 'c.ts', edgeTypes: ['import'] },
    ]);
  });
});
