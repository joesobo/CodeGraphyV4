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
    { id: 'a.ts->b.ts#import', from: 'a.ts', to: 'b.ts', kind: 'import', sources: [] },
    { id: 'a.ts->c.ts#import', from: 'a.ts', to: 'c.ts', kind: 'import', sources: [] },
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
});
