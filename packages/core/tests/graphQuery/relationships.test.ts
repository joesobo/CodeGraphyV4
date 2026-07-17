import { describe, expect, it } from 'vitest';
import type { IAnalysisRelation, IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import type { IGraphData, IGraphEdge, IGraphNode } from '../../src/graph/contracts';
import { listGraphRelationships } from '../../src/graphQuery';

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
    signature: 'function createUser()',
    range: { startLine: 20, endLine: 38 },
    metadata: {
      language: 'typescript',
      source: 'core:treesitter',
      pluginKind: 'function-declaration',
    },
  },
  {
    id: 'packages/app/src/b.ts#buildUser',
    filePath: 'packages/app/src/b.ts',
    name: 'buildUser',
    kind: 'function',
    range: { startLine: 40, endLine: 58 },
  },
  {
    id: 'packages/app/src/b.ts#anonymous',
    filePath: 'packages/app/src/b.ts',
    name: 'anonymous',
    kind: '',
  },
];

const relations: IAnalysisRelation[] = [
  {
    kind: 'type-import',
    sourceId: 'core:treesitter:type-import',
    fromFilePath: 'packages/app/src/a.ts',
    toFilePath: 'packages/app/src/b.ts',
    toSymbolId: 'packages/app/src/b.ts#UserConfig',
  },
  {
    kind: 'import',
    sourceId: 'core:treesitter:import',
    fromFilePath: 'packages/app/src/a.ts',
    toFilePath: 'packages/app/src/b.ts',
    toSymbolId: 'packages/app/src/b.ts#createUser',
  },
  {
    kind: 'import',
    sourceId: 'core:treesitter:import',
    fromFilePath: 'packages/app/src/a.ts',
    toFilePath: 'packages/app/src/b.ts',
    toSymbolId: 'packages/app/src/b.ts#createUser',
  },
  {
    kind: 'import',
    sourceId: 'core:treesitter:import',
    fromFilePath: 'packages/app/src/a.ts',
    toFilePath: 'packages/app/src/b.ts',
    toSymbolId: 'packages/app/src/b.ts#buildUser',
  },
  {
    kind: 'import',
    sourceId: 'core:treesitter:import',
    fromFilePath: 'packages/app/src/a.ts',
    toFilePath: 'packages/app/src/b.ts',
    toSymbolId: 'packages/app/src/b.ts#anonymous',
  },
  {
    kind: 'reference',
    pluginId: 'plugin.routes',
    sourceId: 'route-reference',
    fromFilePath: 'packages/app/src/c.ts',
    toFilePath: 'packages/app/src/b.ts',
  },
  {
    kind: 'reference',
    pluginId: 'plugin.forms',
    sourceId: 'form-reference',
    fromFilePath: 'packages/app/src/c.ts',
    toFilePath: 'packages/app/src/b.ts',
    toSymbolId: 'packages/app/src/b.ts#missing',
  },
  {
    kind: 'reference',
    pluginId: 'plugin.routes',
    sourceId: 'missing-target',
    fromFilePath: 'packages/app/src/c.ts',
  },
  {
    kind: 'import',
    sourceId: 'invisible-import',
    fromFilePath: 'packages/app/src/b.ts',
    toFilePath: 'packages/app/src/c.ts',
    toSymbolId: 'packages/app/src/b.ts#createUser',
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
                id: 'packages/app/src/b.ts#createUser',
                filePath: 'packages/app/src/b.ts',
                name: 'createUser',
                kind: 'function',
                signature: 'function createUser()',
                range: { startLine: 20, endLine: 38 },
                language: 'typescript',
                source: 'core:treesitter',
                pluginKind: 'function-declaration',
              },
              {
                id: 'packages/app/src/b.ts#buildUser',
                filePath: 'packages/app/src/b.ts',
                name: 'buildUser',
                kind: 'function',
                range: { startLine: 40, endLine: 58 },
              },
              {
                id: 'packages/app/src/b.ts#anonymous',
                filePath: 'packages/app/src/b.ts',
                name: 'anonymous',
              },
            ],
          },
          {
            edgeType: 'type-import',
            symbols: [
              {
                id: 'packages/app/src/b.ts#UserConfig',
                filePath: 'packages/app/src/b.ts',
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
      nextOffset: null,
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
          {
            edgeType: 'reference',
            provenance: {
              pluginId: 'plugin.forms',
              sourceId: 'form-reference',
            },
            symbols: [],
          },
        ],
      },
    ]);
  });

  it('filters relationship reports by endpoint and edge type fields', () => {
    const result = listGraphRelationships({
      graphData,
      symbols,
      relations,
    }, {
      filters: [
        { field: 'from', op: 'equals', value: 'packages/app/src/c.ts' },
        { field: 'to', op: 'endsWith', value: 'b.ts' },
        { field: 'edgeTypes', op: 'includes', value: 'reference' },
        { field: 'unknown', op: 'equals', value: '' },
      ],
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
          {
            edgeType: 'reference',
            provenance: {
              pluginId: 'plugin.forms',
              sourceId: 'form-reference',
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

  it('filters out invisible relation evidence before grouping', () => {
    const result = listGraphRelationships({
      graphData,
      symbols,
      relations,
    }, {
      scope: {
        nodes: { file: true },
        edges: { import: false, reference: true },
      },
      from: 'packages/app/src/a.ts',
      to: 'packages/app/src/b.ts',
    });

    expect(result.relationships).toEqual([]);
  });

  it('returns no relationships when relation or symbol indexes are absent', () => {
    expect(listGraphRelationships({
      graphData,
      symbols,
    }).relationships).toEqual([]);

    expect(listGraphRelationships({
      graphData,
      relations,
    }, {
      from: 'packages/app/src/a.ts',
      to: 'packages/app/src/b.ts',
    }).relationships).toEqual([
      {
        from: 'packages/app/src/a.ts',
        to: 'packages/app/src/b.ts',
        relationships: [
          { edgeType: 'import', symbols: [] },
          { edgeType: 'type-import', symbols: [] },
        ],
      },
    ]);
  });
});
