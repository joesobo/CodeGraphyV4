import { describe, expect, it } from 'vitest';
import type { IAnalysisRelation, IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import type { IGraphData, IGraphEdge, IGraphNode } from '../../../src/graph/contracts';
import {
  createRelationEvidence,
  createStructuralEvidence,
} from '../../../src/graphQuery/relationships/evidence';
import { createSymbolMap } from '../../../src/graphQuery/relationships/symbols';
import { edgeKey } from '../../../src/graphQuery/relationships/visibility';

function node(id: string, nodeType = 'file'): IGraphNode {
  return { id, label: id, nodeType };
}

function edge(from: string, to: string, kind: IGraphEdge['kind']): IGraphEdge {
  return { id: `${from}->${to}#${kind}`, from, to, kind, sources: [] };
}

const graphData: IGraphData = {
  nodes: [
    node('src'),
    node('src/a.ts'),
    node('src/b.ts'),
    node('src/hidden.ts'),
  ],
  edges: [
    edge('src/a.ts', 'src/b.ts', 'reference'),
    edge('src', 'src/a.ts', 'nests'),
    edge('src', 'src/hidden.ts', 'nests'),
  ],
};

const symbols: IAnalysisSymbol[] = [
  {
    id: 'src/b.ts#User:type',
    filePath: 'src/b.ts',
    name: 'User',
    kind: 'type',
  },
];

describe('core/graphQuery/relationships/evidence', () => {
  it('creates relation evidence for visible file and node endpoints with provenance and symbols', () => {
    const relations: IAnalysisRelation[] = [
      {
        kind: 'reference',
        pluginId: 'plugin.symbols',
        sourceId: 'symbol-reference',
        fromFilePath: 'src/a.ts',
        toFilePath: 'src/b.ts',
        toSymbolId: 'src/b.ts#User:type',
      },
      {
        kind: 'reference',
        pluginId: 'plugin.symbols',
        sourceId: 'node-reference',
        fromFilePath: 'src/a.ts',
        fromNodeId: 'src/a.ts',
        toNodeId: 'src/b.ts',
      },
      {
        kind: 'reference',
        pluginId: 'plugin.symbols',
        sourceId: 'missing-target',
        fromFilePath: 'src/a.ts',
      },
      {
        kind: 'import',
        pluginId: 'plugin.symbols',
        sourceId: 'invisible-import',
        fromFilePath: 'src/a.ts',
        toFilePath: 'src/b.ts',
      },
    ];
    const visibleEdgeKeys = new Set([
      edgeKey({ from: 'src/a.ts', to: 'src/b.ts', kind: 'reference' }),
      'src/a.ts\u0000undefined\u0000reference',
    ]);

    expect(createRelationEvidence(relations, createSymbolMap(symbols), visibleEdgeKeys)).toEqual([
      {
        from: 'src/a.ts',
        to: 'src/b.ts',
        edgeType: 'reference',
        provenance: { pluginId: 'plugin.symbols', sourceId: 'symbol-reference' },
        symbol: {
          id: 'src/b.ts#User:type',
          filePath: 'src/b.ts',
          name: 'User',
          kind: 'type',
        },
      },
      {
        from: 'src/a.ts',
        to: 'src/b.ts',
        edgeType: 'reference',
        provenance: { pluginId: 'plugin.symbols', sourceId: 'node-reference' },
      },
    ]);
  });

  it('returns no relation evidence when relation data is missing', () => {
    expect(createRelationEvidence(undefined, createSymbolMap(symbols), new Set())).toEqual([]);
  });

  it('creates structural nests evidence only for scoped and visible edges', () => {
    const visibleEdgeKeys = new Set([edgeKey({ from: 'src', to: 'src/a.ts', kind: 'nests' })]);

    expect(createStructuralEvidence({ graphData }, {
      edgeType: 'nests',
      scope: {
        nodes: { file: true, folder: true },
        edges: { nests: true },
      },
    }, visibleEdgeKeys)).toEqual([
      {
        from: 'src',
        to: 'src/a.ts',
        edgeType: 'nests',
      },
      {
        from: 'src',
        to: 'src/a.ts',
        edgeType: 'nests',
      },
    ]);
  });

  it('does not create structural evidence for visible non-nesting edges', () => {
    expect(createStructuralEvidence({ graphData }, {}, new Set([
      edgeKey({ from: 'src/a.ts', to: 'src/b.ts', kind: 'reference' }),
    ]))).toEqual([]);
  });
});
