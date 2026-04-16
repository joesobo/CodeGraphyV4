import { describe, expect, it } from 'vitest';
import {
  createGraphEdgeId,
  getGraphEdgeIdSuffix,
  replaceGraphEdgeIdEndpoints,
} from '../../../src/shared/graph/edgeIdentity';

describe('shared/graph/edgeIdentity', () => {
  it('creates edge ids without optional type or variant segments', () => {
    expect(createGraphEdgeId({
      from: 'a',
      to: 'b',
      kind: 'import',
    })).toBe('a->b#import');
  });

  it('creates edge ids with optional type and variant segments', () => {
    expect(createGraphEdgeId({
      from: 'a',
      to: 'b',
      kind: 'import',
      type: 'dynamic',
      variant: 'async',
    })).toBe('a->b#import:dynamic~async');
  });

  it('returns the existing suffix when the edge id already contains one', () => {
    expect(getGraphEdgeIdSuffix('a->b#import:dynamic', 'import')).toBe('#import:dynamic');
  });

  it('returns a default suffix when the edge id has no hash segment', () => {
    expect(getGraphEdgeIdSuffix('a->b', 'import')).toBe('#import');
  });

  it('replaces edge endpoints while preserving the suffix', () => {
    expect(replaceGraphEdgeIdEndpoints(
      { id: 'a->b#import:dynamic', kind: 'import' },
      'left',
      'right',
    )).toBe('left->right#import:dynamic');
  });
});
