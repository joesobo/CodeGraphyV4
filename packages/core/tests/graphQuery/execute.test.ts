import { describe, expect, it } from 'vitest';
import { executeGraphQuery } from '../../src/graphQuery';
import type { GraphQueryData } from '../../src/graphQuery';

const queryData: GraphQueryData = {
  graphData: {
    nodes: [
      { id: 'a.ts', label: 'a.ts', nodeType: 'file' },
      { id: 'b.ts', label: 'b.ts', nodeType: 'file' },
    ],
    edges: [
      { id: 'a.ts->b.ts#import', from: 'a.ts', to: 'b.ts', kind: 'import', sources: [] },
    ],
  },
  symbols: [
    {
      id: 'b.ts#Thing',
      filePath: 'b.ts',
      name: 'Thing',
      kind: 'type',
    },
  ],
  relations: [
    {
      kind: 'import',
      sourceId: 'core:treesitter:import',
      fromFilePath: 'a.ts',
      toFilePath: 'b.ts',
      toSymbolId: 'b.ts#Thing',
    },
  ],
};

describe('core/graphQuery executeGraphQuery', () => {
  it('dispatches node reports', () => {
    expect(executeGraphQuery(queryData, { report: 'nodes', arguments: { limit: 1 } })).toMatchObject({
      nodes: [{ path: 'a.ts', nodeType: 'file' }],
    });
  });

  it('dispatches edge reports', () => {
    expect(executeGraphQuery(queryData, {
      report: 'edges',
      arguments: { filters: [{ field: 'from', op: 'equals', value: 'a.ts' }] },
    })).toMatchObject({
      edges: [{ from: 'a.ts', to: 'b.ts', edgeTypes: ['import'] }],
    });
  });

  it('dispatches relationship reports', () => {
    expect(executeGraphQuery(queryData, {
      report: 'relationships',
      arguments: { edgeType: 'import' },
    })).toMatchObject({
      relationships: [
        {
          from: 'a.ts',
          to: 'b.ts',
          relationships: [{ edgeType: 'import' }],
        },
      ],
    });
  });

  it('dispatches symbol reports', () => {
    expect(executeGraphQuery(queryData, {
      report: 'symbols',
      arguments: { filePath: 'b.ts', filters: [{ field: 'name', op: 'equals', value: 'Thing' }] },
    })).toMatchObject({
      symbols: [{ filePath: 'b.ts', name: 'Thing', kind: 'type' }],
    });
  });

  it('dispatches path reports', () => {
    expect(executeGraphQuery(queryData, { report: 'paths', arguments: { from: 'a.ts', to: 'b.ts' } })).toMatchObject({
      paths: [['a.ts', 'b.ts']],
    });
  });
});
