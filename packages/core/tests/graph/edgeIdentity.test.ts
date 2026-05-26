import { describe, expect, it } from 'vitest';
import {
  createGraphEdgeId,
  getGraphEdgeIdSuffix,
  replaceGraphEdgeIdEndpoints,
} from '../../src/graph/edgeIdentity';

describe('graph/edgeIdentity', () => {
  it('creates edge ids with optional type and variant suffixes', () => {
    expect(createGraphEdgeId({ from: 'a.ts', to: 'b.ts', kind: 'import' })).toBe('a.ts->b.ts#import');
    expect(createGraphEdgeId({
      from: 'a.ts',
      to: 'b.ts',
      kind: 'reference',
      type: 'value',
      variant: 'dynamic',
    })).toBe('a.ts->b.ts#reference:value~dynamic');
  });

  it('reads and preserves edge id suffixes when endpoints change', () => {
    expect(getGraphEdgeIdSuffix('a.ts->b.ts#import:value~dynamic', 'import')).toBe('#import:value~dynamic');
    expect(getGraphEdgeIdSuffix('legacy-edge-id', 'reference')).toBe('#reference');
    expect(replaceGraphEdgeIdEndpoints(
      { id: 'a.ts->b.ts#import:value~dynamic', kind: 'import' },
      'src/new-a.ts',
      'src/new-b.ts',
    )).toBe('src/new-a.ts->src/new-b.ts#import:value~dynamic');
  });
});
