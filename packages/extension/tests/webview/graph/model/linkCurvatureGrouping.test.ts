import { describe, it, expect } from 'vitest';
import {
  resolveId,
  groupLinksByNodePair,
} from '../../../../src/webview/components/graph/model/link/grouping';
import type { CurvatureLink } from '../../../../src/webview/components/graph/model/link/curvature';

describe('resolveId', () => {
  it('returns empty string for null', () => {
    expect(resolveId(null as unknown as undefined)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(resolveId(undefined)).toBe('');
  });

  it('returns the string as-is for string input', () => {
    expect(resolveId('abc')).toBe('abc');
  });

  it('converts number to string', () => {
    expect(resolveId(42)).toBe('42');
  });

  it('extracts id from object with string id', () => {
    expect(resolveId({ id: 'node-1' })).toBe('node-1');
  });

  it('extracts id from object with numeric id', () => {
    expect(resolveId({ id: 7 })).toBe('7');
  });

  it('returns empty string for object with undefined id', () => {
    expect(resolveId({ id: undefined })).toBe('');
  });

  it('returns empty string for object without id property', () => {
    expect(resolveId({} as { id?: string })).toBe('');
  });
});

describe('groupLinksByNodePair', () => {
  it('returns empty groups for empty input', () => {
    const result = groupLinksByNodePair([]);
    expect(result.selfLoopLinks).toEqual({});
    expect(result.sameNodesLinks).toEqual({});
  });

  it('groups self-loops separately from regular links', () => {
    const links: CurvatureLink[] = [
      { source: 'A', target: 'A' },
      { source: 'A', target: 'B' },
    ];
    const result = groupLinksByNodePair(links);

    expect(Object.keys(result.selfLoopLinks)).toHaveLength(1);
    expect(Object.keys(result.sameNodesLinks)).toHaveLength(1);
  });

  it('uses canonical pair ordering (alphabetical)', () => {
    const links: CurvatureLink[] = [
      { source: 'B', target: 'A' },
      { source: 'A', target: 'B' },
    ];
    const result = groupLinksByNodePair(links);

    expect(Object.keys(result.sameNodesLinks)).toEqual(['A_B']);
    expect(result.sameNodesLinks['A_B']).toHaveLength(2);
  });

  it('sets nodePairId on each link', () => {
    const links: CurvatureLink[] = [
      { source: 'X', target: 'Y' },
    ];
    groupLinksByNodePair(links);
    expect(links[0].nodePairId).toBe('X_Y');
  });

  it('groups multiple self-loops by the same node', () => {
    const links: CurvatureLink[] = [
      { source: 'A', target: 'A' },
      { source: 'A', target: 'A' },
    ];
    const result = groupLinksByNodePair(links);

    expect(result.selfLoopLinks['A_A']).toHaveLength(2);
  });

  it('handles object-style node references', () => {
    const links: CurvatureLink[] = [
      { source: { id: 'A' }, target: { id: 'B' } },
    ];
    const result = groupLinksByNodePair(links);

    expect(result.sameNodesLinks['A_B']).toHaveLength(1);
  });
});
