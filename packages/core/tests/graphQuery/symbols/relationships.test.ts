import { describe, expect, it } from 'vitest';
import type { IAnalysisRelation, IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import type { IGraphData } from '../../../src/graph/contracts';
import { createRelationshipSymbols } from '../../../src/graphQuery/symbols/relationships';

const graphData: IGraphData = {
  nodes: [
    { id: 'src/source.ts', label: 'source.ts', nodeType: 'file' },
    { id: 'src/target.ts', label: 'target.ts', nodeType: 'file' },
    {
      id: 'src/target.ts#Target:type',
      label: 'Target',
      nodeType: 'symbol',
      symbol: {
        id: 'src/target.ts#Target:type',
        filePath: 'src/target.ts',
        name: 'Target',
        kind: 'type',
      },
    },
  ],
  edges: [
    {
      id: 'src/target.ts->src/target.ts#Target:type#contains',
      from: 'src/target.ts',
      to: 'src/target.ts#Target:type',
      kind: 'contains',
      sources: [],
    },
  ],
};

const symbols: IAnalysisSymbol[] = [
  {
    id: 'src/target.ts#Target:type',
    filePath: 'src/target.ts',
    name: 'Target',
    kind: 'type',
    signature: 'type Target = string',
  },
  {
    id: 'src/source.ts#caller:function',
    filePath: 'src/source.ts',
    name: 'caller',
    kind: 'function',
  },
];

const relations: IAnalysisRelation[] = [
  {
    kind: 'type-import',
    sourceId: 'type-import',
    fromFilePath: 'src/source.ts',
    toFilePath: 'src/target.ts',
    toSymbolId: 'src/target.ts#Target:type',
  },
  {
    kind: 'reference',
    pluginId: 'plugin.symbols',
    sourceId: 'self-reference',
    fromFilePath: 'src/source.ts',
    fromSymbolId: 'src/source.ts#caller:function',
    toFilePath: 'src/target.ts',
  },
  {
    kind: 'reference',
    pluginId: 'plugin.symbols',
    sourceId: 'duplicate-reference',
    fromFilePath: 'src/source.ts',
    toFilePath: 'src/target.ts',
    toSymbolId: 'src/target.ts#Target:type',
  },
];

describe('core/graphQuery/symbols/relationships', () => {
  it('returns relationship-backed symbols once and removes type kind for type-import relationships', () => {
    expect(createRelationshipSymbols({
      graphData,
      relations,
      symbols,
    }, {
      relatedFrom: 'src/source.ts',
      relatedTo: 'src/target.ts',
      edgeType: 'type-import',
    })).toEqual([
      {
        id: 'src/target.ts#Target:type',
        name: 'Target',
        signature: 'type Target = string',
      },
    ]);
  });

  it('can resolve a relationship symbol from the source symbol id', () => {
    expect(createRelationshipSymbols({
      graphData,
      relations,
      symbols,
    }, {
      edgeType: 'reference',
      filePath: 'src/source.ts',
    })).toEqual([
      {
        id: 'src/source.ts#caller:function',
        name: 'caller',
        kind: 'function',
      },
    ]);
  });

  it('honors explicit symbol graph scope before returning relationship symbols', () => {
    expect(createRelationshipSymbols({
      graphData,
      relations,
      symbols,
    }, {
      edgeType: 'type-import',
      scope: {
        nodes: { file: true, symbol: false },
        edges: { contains: true },
      },
    })).toEqual([]);
  });

  it('returns no relationship symbols when symbol or relation indexes are missing', () => {
    expect(createRelationshipSymbols({
      graphData,
      relations,
    }, {
      edgeType: 'type-import',
    })).toEqual([]);

    expect(createRelationshipSymbols({
      graphData,
      symbols,
    }, {
      edgeType: 'type-import',
    })).toEqual([]);
  });
});
