import { describe, expect, it } from 'vitest';
import type { IAnalysisRelation, IAnalysisSymbol } from '../../../src/core/plugins/types/contracts';
import type { IGraphData, IGraphEdge, IGraphNode } from '../../../src/shared/graph/contracts';
import { listGraphRelationships } from '../../../src/core/graphQuery';

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
    node('packages/app/src/a.ts'),
    node('packages/app/src/b.ts'),
    node('packages/app/src/c.ts'),
  ],
  edges: [
    edge('packages/app/src/a.ts', 'packages/app/src/b.ts', 'type-import'),
    edge('packages/app/src/a.ts', 'packages/app/src/b.ts', 'import'),
    edge('packages/app/src/c.ts', 'packages/app/src/b.ts', 'reference'),
  ],
};

const symbols: IAnalysisSymbol[] = [
  {
    id: 'packages/app/src/b.ts#UserConfig',
    filePath: 'packages/app/src/b.ts',
    name: 'UserConfig',
    kind: 'type',
    range: { startLine: 3, endLine: 8 },
  },
  {
    id: 'packages/app/src/b.ts#createUser',
    filePath: 'packages/app/src/b.ts',
    name: 'createUser',
    kind: 'function',
    range: { startLine: 20, endLine: 38 },
  },
];

const relations: IAnalysisRelation[] = [
  {
    kind: 'type-import',
    pluginId: 'codegraphy.treesitter',
    sourceId: 'codegraphy.treesitter:type-import',
    fromFilePath: 'packages/app/src/a.ts',
    toFilePath: 'packages/app/src/b.ts',
    toSymbolId: 'packages/app/src/b.ts#UserConfig',
  },
  {
    kind: 'import',
    pluginId: 'codegraphy.treesitter',
    sourceId: 'codegraphy.treesitter:import',
    fromFilePath: 'packages/app/src/a.ts',
    toFilePath: 'packages/app/src/b.ts',
    toSymbolId: 'packages/app/src/b.ts#createUser',
  },
  {
    kind: 'reference',
    pluginId: 'plugin.routes',
    sourceId: 'route-reference',
    fromFilePath: 'packages/app/src/c.ts',
    toFilePath: 'packages/app/src/b.ts',
  },
];

describe('core/graphQuery relationships report', () => {
  it('groups detailed relationships by node pair and edge type with symbol evidence', () => {
    const result = listGraphRelationships({
      graphData,
      symbols,
      relations,
    }, {
      from: 'packages/app/src/a.ts',
      to: 'packages/app/src/b.ts',
    });

    expect(result.relationships).toEqual([
      {
        from: 'packages/app/src/a.ts',
        to: 'packages/app/src/b.ts',
        relationships: [
          {
            edgeType: 'import',
            symbols: [
              {
                name: 'createUser',
                kind: 'function',
                range: { startLine: 20, endLine: 38 },
              },
            ],
          },
          {
            edgeType: 'type-import',
            symbols: [
              {
                name: 'UserConfig',
                range: { startLine: 3, endLine: 8 },
              },
            ],
          },
        ],
      },
    ]);
    expect(result.page).toEqual({
      offset: 0,
      limit: 500,
      returned: 1,
      total: 1,
    });
  });

  it('keeps plugin provenance and hides core Tree-sitter provenance', () => {
    const result = listGraphRelationships({
      graphData,
      symbols,
      relations,
    }, {
      edgeType: 'reference',
    });

    expect(result.relationships).toEqual([
      {
        from: 'packages/app/src/c.ts',
        to: 'packages/app/src/b.ts',
        relationships: [
          {
            edgeType: 'reference',
            provenance: {
              pluginId: 'plugin.routes',
              sourceId: 'route-reference',
            },
            symbols: [],
          },
        ],
      },
    ]);
  });

  it('includes structural nests relationships only when graph scope opts in', () => {
    const result = listGraphRelationships({
      graphData,
      symbols,
      relations,
    }, {
      scope: {
        nodes: { file: true, folder: true },
        edges: { nests: true },
      },
      edgeType: 'nests',
      limit: 100,
    });

    expect(result.relationships).toEqual(
      expect.arrayContaining([
        {
          from: 'packages/app/src',
          to: 'packages/app/src/a.ts',
          relationships: [
            {
              edgeType: 'nests',
              symbols: [],
            },
          ],
        },
      ]),
    );
  });
});
