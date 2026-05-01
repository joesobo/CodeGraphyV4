import { describe, expect, it } from 'vitest';
import type { IAnalysisRelation, IAnalysisSymbol } from '../../../src/core/plugins/types/contracts';
import type { IGraphData } from '../../../src/shared/graph/contracts';
import { listGraphSymbols } from '../../../src/core/graphQuery';

const graphData: IGraphData = {
  nodes: [
    { id: 'packages/app/src/a.ts', label: 'a.ts', color: '#111111', nodeType: 'file' },
    { id: 'packages/app/src/b.ts', label: 'b.ts', color: '#111111', nodeType: 'file' },
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
});
