import { describe, expect, it } from 'vitest';
import type { IAnalysisRelation, IAnalysisSymbol } from '../../../src/core/plugins/types/contracts';
import type { IGraphData } from '../../../src/shared/graph/contracts';
import { listGraphSymbols } from '../../../src/core/graphQuery';

const graphData: IGraphData = {
  nodes: [
    { id: 'packages/app/src/a.ts', label: 'a.ts', color: '#111111', nodeType: 'file' },
    { id: 'packages/app/src/b.ts', label: 'b.ts', color: '#111111', nodeType: 'file' },
    { id: 'packages/app/src/c.ts', label: 'c.ts', color: '#111111', nodeType: 'file' },
  ],
  edges: [
    {
      id: 'packages/app/src/a.ts->packages/app/src/b.ts#type-import',
      from: 'packages/app/src/a.ts',
      to: 'packages/app/src/b.ts',
      kind: 'type-import',
      sources: [],
    },
  ],
};

const symbols: IAnalysisSymbol[] = [
  {
    id: 'packages/app/src/c.ts#External',
    filePath: 'packages/app/src/c.ts',
    name: 'External',
    kind: 'function',
    range: { startLine: 5, endLine: 7 },
  },
  {
    id: 'packages/app/src/b.ts#Unused',
    filePath: 'packages/app/src/b.ts',
    name: 'Unused',
    kind: 'function',
    range: { startLine: 1, endLine: 2 },
  },
  {
    id: 'packages/app/src/b.ts#UserConfig',
    filePath: 'packages/app/src/b.ts',
    name: 'UserConfig',
    kind: 'type',
    range: { startLine: 3, endLine: 8 },
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
    kind: 'type-import',
    pluginId: 'codegraphy.treesitter',
    sourceId: 'codegraphy.treesitter:type-import',
    fromFilePath: 'packages/app/src/a.ts',
    toFilePath: 'packages/app/src/b.ts',
    toSymbolId: 'packages/app/src/b.ts#UserConfig',
  },
  {
    kind: 'reference',
    pluginId: 'plugin.routes',
    sourceId: 'route-reference',
    fromFilePath: 'packages/app/src/a.ts',
    toFilePath: 'packages/app/src/b.ts',
    toSymbolId: 'packages/app/src/b.ts#Unused',
  },
  {
    kind: 'reference',
    pluginId: 'plugin.routes',
    sourceId: 'route-reference',
    fromFilePath: 'packages/app/src/a.ts',
    toFilePath: 'packages/app/src/c.ts',
    toSymbolId: 'packages/app/src/c.ts#External',
  },
];

describe('core/graphQuery symbols report', () => {
  it('lists every declared symbol for a file when no relationship filters are present', () => {
    const result = listGraphSymbols({
      graphData,
      symbols,
      relations,
    }, {
      filePath: 'packages/app/src/b.ts',
    });

    expect(result.symbols).toEqual([
      {
        filePath: 'packages/app/src/b.ts',
        name: 'Unused',
        kind: 'function',
        range: { startLine: 1, endLine: 2 },
      },
      {
        filePath: 'packages/app/src/b.ts',
        name: 'UserConfig',
        kind: 'type',
        range: { startLine: 3, endLine: 8 },
      },
    ]);
  });

  it('sorts declared symbols by file path and name by default', () => {
    const result = listGraphSymbols({
      graphData,
      symbols,
      relations,
    });

    expect(result.symbols.map((symbol) => `${symbol.filePath}:${symbol.name}`)).toEqual([
      'packages/app/src/b.ts:Unused',
      'packages/app/src/b.ts:UserConfig',
      'packages/app/src/c.ts:External',
    ]);
  });

  it('returns only relationship-backed symbols when relationship filters are present', () => {
    const result = listGraphSymbols({
      graphData,
      symbols,
      relations,
    }, {
      filePath: 'packages/app/src/b.ts',
      relatedFrom: 'packages/app/src/a.ts',
      relatedTo: 'packages/app/src/b.ts',
      edgeType: 'type-import',
    });

    expect(result.symbols).toEqual([
      {
        name: 'UserConfig',
        range: { startLine: 3, endLine: 8 },
      },
    ]);
    expect(result.page).toEqual({
      offset: 0,
      limit: 500,
      returned: 1,
      total: 1,
    });
  });

  it('filters relationship-backed symbols by related target only', () => {
    const result = listGraphSymbols({
      graphData,
      symbols,
      relations,
    }, {
      relatedTo: 'packages/app/src/b.ts',
      edgeType: 'reference',
      sort: [{ by: 'name', direction: 'asc' }],
    });

    expect(result.symbols).toEqual([
      {
        name: 'Unused',
        kind: 'function',
        range: { startLine: 1, endLine: 2 },
      },
    ]);
  });

  it('filters relationship-backed symbols by file path after matching relations', () => {
    const result = listGraphSymbols({
      graphData,
      symbols,
      relations,
    }, {
      filePath: 'packages/app/src/b.ts',
      relatedFrom: 'packages/app/src/a.ts',
      edgeType: 'reference',
      sort: [{ by: 'name', direction: 'asc' }],
    });

    expect(result.symbols).toEqual([
      {
        name: 'Unused',
        kind: 'function',
        range: { startLine: 1, endLine: 2 },
      },
    ]);
  });

  it('returns no relationship-backed symbols when relation filters do not match', () => {
    const result = listGraphSymbols({
      graphData,
      symbols,
      relations,
    }, {
      relatedFrom: 'packages/app/src/c.ts',
      relatedTo: 'packages/app/src/b.ts',
      edgeType: 'type-import',
    });

    expect(result.symbols).toEqual([]);
  });

  it('applies search, sort, and field filters to declared symbols', () => {
    const result = listGraphSymbols({
      graphData,
      symbols,
      relations,
    }, {
      filePath: 'packages/app/src/b.ts',
      search: 'user',
      filters: [
        { field: 'kind', op: 'equals', value: 'type' },
        { field: 'name', op: 'startsWith', value: 'User' },
      ],
      sort: [{ by: 'name', direction: 'desc' }],
    });

    expect(result.symbols).toEqual([
      {
        filePath: 'packages/app/src/b.ts',
        name: 'UserConfig',
        kind: 'type',
        range: { startLine: 3, endLine: 8 },
      },
    ]);
  });

  it('searches declared symbols across file path, name, and kind', () => {
    const result = listGraphSymbols({
      graphData,
      symbols,
      relations,
    }, {
      search: 'function',
      sort: [{ by: 'name', direction: 'asc' }],
    });

    expect(result.symbols).toEqual([
      {
        filePath: 'packages/app/src/c.ts',
        name: 'External',
        kind: 'function',
        range: { startLine: 5, endLine: 7 },
      },
      {
        filePath: 'packages/app/src/b.ts',
        name: 'Unused',
        kind: 'function',
        range: { startLine: 1, endLine: 2 },
      },
    ]);
  });

  it('treats blank symbol search as no search', () => {
    const result = listGraphSymbols({
      graphData,
      symbols,
      relations,
    }, {
      filePath: 'packages/app/src/b.ts',
      search: '  ',
    });

    expect(result.symbols).toHaveLength(2);
  });

  it('supports filters for missing relationship symbol fields', () => {
    const result = listGraphSymbols({
      graphData,
      symbols,
      relations,
    }, {
      relatedFrom: 'packages/app/src/a.ts',
      edgeType: 'type-import',
      filters: [
        { field: 'filePath', op: 'equals', value: '' },
        { field: 'kind', op: 'equals', value: '' },
        { field: 'unknown', op: 'equals', value: '' },
      ],
    });

    expect(result.symbols).toEqual([
      {
        name: 'UserConfig',
        range: { startLine: 3, endLine: 8 },
      },
    ]);
  });

  it('returns no relationship-backed symbols without relation or symbol indexes', () => {
    expect(listGraphSymbols({
      graphData,
      relations,
    }, {
      relatedFrom: 'packages/app/src/a.ts',
    }).symbols).toEqual([]);

    expect(listGraphSymbols({
      graphData,
      symbols,
    }, {
      relatedFrom: 'packages/app/src/a.ts',
    }).symbols).toEqual([]);
  });
});
