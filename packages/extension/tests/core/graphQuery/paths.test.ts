import { describe, expect, it } from 'vitest';
import type { IGraphData } from '../../../src/shared/graph/contracts';
import { findGraphPaths } from '../../../src/core/graphQuery';

const graphData: IGraphData = {
  nodes: [
    { id: 'a.ts', label: 'a.ts', color: '#111111', nodeType: 'file' },
    { id: 'b.ts', label: 'b.ts', color: '#111111', nodeType: 'file' },
    { id: 'c.ts', label: 'c.ts', color: '#111111', nodeType: 'file' },
    { id: 'd.ts', label: 'd.ts', color: '#111111', nodeType: 'file' },
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
        { id: 'a.ts', label: 'a.ts', color: '#111111', nodeType: 'file' },
        { id: 'b.ts', label: 'b.ts', color: '#111111', nodeType: 'file' },
        { id: 'd.ts', label: 'd.ts', color: '#111111', nodeType: 'file' },
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
});
