import { describe, expect, it } from 'vitest';
import type { IGraphData } from '../../src/graph/contracts';
import { findGraphPaths } from '../../src/graphQuery';

const graphData: IGraphData = {
  nodes: [
    { id: 'a.ts', label: 'a.ts', nodeType: 'file' },
    { id: 'b.ts', label: 'b.ts', nodeType: 'file' },
    { id: 'c.ts', label: 'c.ts', nodeType: 'file' },
    { id: 'd.ts', label: 'd.ts', nodeType: 'file' },
  ],
  edges: [
    { id: 'a.ts->c.ts#import', from: 'a.ts', to: 'c.ts', kind: 'import', sources: [] },
    { id: 'a.ts->b.ts#import', from: 'a.ts', to: 'b.ts', kind: 'import', sources: [] },
    { id: 'b.ts->d.ts#import', from: 'b.ts', to: 'd.ts', kind: 'import', sources: [] },
    { id: 'c.ts->d.ts#import', from: 'c.ts', to: 'd.ts', kind: 'import', sources: [] },
  ],
};

describe('core/graphQuery paths report', () => {
  it('returns bounded directed node paths with default limits', () => {
    expect(findGraphPaths(graphData, { from: 'a.ts', to: 'd.ts' })).toEqual({
      from: 'a.ts',
      to: 'd.ts',
      paths: [
        ['a.ts', 'b.ts', 'd.ts'],
        ['a.ts', 'c.ts', 'd.ts'],
      ],
      complete: true,
      limits: {
        maxDepth: 10,
        maxPaths: 3,
      },
    });
  });

  it('returns an empty paths list when no path exists', () => {
    expect(findGraphPaths(graphData, { from: 'd.ts', to: 'a.ts' })).toEqual({
      from: 'd.ts',
      to: 'a.ts',
      paths: [],
      complete: true,
      limits: {
        maxDepth: 10,
        maxPaths: 3,
      },
    });
  });

  it('applies explicit max depth and max path limits', () => {
    expect(findGraphPaths(graphData, { from: 'a.ts', to: 'd.ts', maxDepth: 1, maxPaths: 1 })).toEqual({
      from: 'a.ts',
      to: 'd.ts',
      paths: [],
      complete: false,
      limits: {
        maxDepth: 1,
        maxPaths: 1,
      },
    });
  });

  it('returns paths when the max depth reaches the destination', () => {
    expect(findGraphPaths(graphData, { from: 'a.ts', to: 'd.ts', maxDepth: 2 })).toMatchObject({
      paths: [
        ['a.ts', 'b.ts', 'd.ts'],
        ['a.ts', 'c.ts', 'd.ts'],
      ],
      limits: {
        maxDepth: 2,
      },
    });
  });

  it('returns no paths when either endpoint is missing from the graph', () => {
    const graphWithExternalEdge: IGraphData = {
      nodes: graphData.nodes,
      edges: [
        { id: 'missing.ts->d.ts#import', from: 'missing.ts', to: 'd.ts', kind: 'import', sources: [] },
        ...graphData.edges,
      ],
    };

    expect(findGraphPaths(graphWithExternalEdge, { from: 'missing.ts', to: 'd.ts' })).toMatchObject({
      from: 'missing.ts',
      to: 'd.ts',
      paths: [],
    });
  });

  it('ignores edges whose source node is missing', () => {
    const graphWithExternalEdge: IGraphData = {
      nodes: graphData.nodes,
      edges: [
        { id: 'missing.ts->d.ts#import', from: 'missing.ts', to: 'd.ts', kind: 'import', sources: [] },
        ...graphData.edges,
      ],
    };

    expect(findGraphPaths(graphWithExternalEdge, { from: 'a.ts', to: 'd.ts' }).paths).toEqual([
      ['a.ts', 'b.ts', 'd.ts'],
      ['a.ts', 'c.ts', 'd.ts'],
    ]);
  });

  it('keeps discovered paths acyclic', () => {
    const graphWithCycle: IGraphData = {
      nodes: [
        { id: 'a.ts', label: 'a.ts', nodeType: 'file' },
        { id: 'b.ts', label: 'b.ts', nodeType: 'file' },
        { id: 'd.ts', label: 'd.ts', nodeType: 'file' },
      ],
      edges: [
        { id: 'a.ts->b.ts#import', from: 'a.ts', to: 'b.ts', kind: 'import', sources: [] },
        { id: 'b.ts->a.ts#import', from: 'b.ts', to: 'a.ts', kind: 'import', sources: [] },
        { id: 'b.ts->d.ts#import', from: 'b.ts', to: 'd.ts', kind: 'import', sources: [] },
      ],
    };

    expect(findGraphPaths(graphWithCycle, { from: 'a.ts', to: 'd.ts', maxDepth: 4, maxPaths: 5 }).paths).toEqual([
      ['a.ts', 'b.ts', 'd.ts'],
    ]);
  });

  it('normalizes invalid path limits to defaults and minimums', () => {
    expect(findGraphPaths(graphData, {
      from: 'a.ts',
      to: 'd.ts',
      maxDepth: Number.NaN,
      maxPaths: 0,
    })).toMatchObject({
      paths: [['a.ts', 'b.ts', 'd.ts']],
      limits: {
        maxDepth: 10,
        maxPaths: 1,
      },
    });
  });

  it('keeps collecting raw symbol routes until projected file paths are unique', () => {
    const symbolNode = (id: string, filePath: string) => ({
      id,
      label: id,
      nodeType: 'symbol',
      symbol: { id, name: id, kind: 'function', filePath },
    });
    const targetSymbols = Array.from({ length: 6 }, (_, index) => symbolNode(
      `z.ts#target${index + 1}:function`,
      'z.ts',
    ));
    const projectedGraph: IGraphData = {
      nodes: [
        { id: 'a.ts', label: 'a.ts', nodeType: 'file' },
        { id: 'z.ts', label: 'z.ts', nodeType: 'file' },
        { id: 'shared.ts', label: 'shared.ts', nodeType: 'file' },
        { id: 'distinct.ts', label: 'distinct.ts', nodeType: 'file' },
        symbolNode('shared.ts#route:function', 'shared.ts'),
        symbolNode('distinct.ts#route:function', 'distinct.ts'),
        ...targetSymbols,
      ],
      edges: [
        { id: 'a-shared', from: 'a.ts', to: 'shared.ts#route:function', kind: 'call', sources: [] },
        { id: 'a-distinct', from: 'a.ts', to: 'distinct.ts#route:function', kind: 'call', sources: [] },
        ...targetSymbols.map((target, index) => ({
          id: `route-${index}`,
          from: index < 5 ? 'shared.ts#route:function' : 'distinct.ts#route:function',
          to: target.id,
          kind: 'call' as const,
          sources: [],
        })),
      ],
    };

    expect(findGraphPaths(projectedGraph, {
      from: 'a.ts',
      to: 'z.ts',
      maxDepth: 2,
      maxPaths: 5,
      expandFileSelectors: true,
      projectFileEndpoints: true,
    }).paths).toEqual([
      ['a.ts', 'shared.ts', 'z.ts'],
      ['a.ts', 'distinct.ts', 'z.ts'],
    ]);
  });
});
