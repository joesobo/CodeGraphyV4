import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../../src/shared/graph/contracts';
import { createGraphViewProviderQueryMethods } from '../../../../../src/extension/graphView/provider/query/methods';

const rawGraphData: IGraphData = {
  nodes: [
    { id: 'src/a.ts', label: 'a.ts', color: '#111111', nodeType: 'file' },
    { id: 'src/b.ts', label: 'b.ts', color: '#111111', nodeType: 'file' },
  ],
  edges: [
    { id: 'src/a.ts->src/b.ts#type-import', from: 'src/a.ts', to: 'src/b.ts', kind: 'type-import', sources: [] },
  ],
};

describe('GraphViewProvider query methods', () => {
  it('executes graph queries from raw graph data and structured analysis snapshot', () => {
    const readStructuredAnalysisSnapshot = vi.fn(() => ({
      files: [],
      symbols: [
        {
          id: 'src/b.ts#UserConfig',
          filePath: 'src/b.ts',
          name: 'UserConfig',
          kind: 'type',
          range: { startLine: 3, endLine: 8 },
        },
      ],
      relations: [
        {
          kind: 'type-import' as const,
          sourceId: 'core:treesitter:type-import',
          fromFilePath: 'src/a.ts',
          toFilePath: 'src/b.ts',
          toSymbolId: 'src/b.ts#UserConfig',
        },
      ],
    }));
    const methods = createGraphViewProviderQueryMethods({
      _rawGraphData: rawGraphData,
      _analyzer: { readStructuredAnalysisSnapshot },
    });

    expect(methods.queryGraph({
      report: 'symbols',
      arguments: {
        relatedFrom: 'src/a.ts',
        relatedTo: 'src/b.ts',
        edgeType: 'type-import',
      },
    })).toEqual({
      symbols: [
        {
          id: 'src/b.ts#UserConfig',
          name: 'UserConfig',
          range: { startLine: 3, endLine: 8 },
        },
      ],
      page: {
        offset: 0,
        limit: 500,
        returned: 1,
        total: 1,
        nextOffset: null,
      },
    });
    expect(readStructuredAnalysisSnapshot).toHaveBeenCalledTimes(1);
  });
});
