import { describe, expect, it } from 'vitest';
import {
  findVisibleCollapsedAncestor,
  isDescendantOf,
} from '../../src/visibleGraph/collapsePaths';

describe('visibleGraph/collapsePaths', () => {
  it('identifies descendants under regular folders and root', () => {
    expect(isDescendantOf('src', 'src/app.ts')).toBe(true);
    expect(isDescendantOf('src', 'src')).toBe(false);
    expect(isDescendantOf('(root)', 'src/app.ts')).toBe(true);
    expect(isDescendantOf('(root)', '(root)')).toBe(false);
  });

  it('chooses the shallowest visible collapsed ancestor', () => {
    expect(findVisibleCollapsedAncestor(
      'src/domain/model.ts',
      new Set(['src/domain', 'src']),
    )).toBe('src');
    expect(findVisibleCollapsedAncestor(
      'src',
      new Set(['src']),
    )).toBe('src');
    expect(findVisibleCollapsedAncestor(
      'src/domain/model.ts',
      new Set(['src/domain', '(root)', 'src']),
    )).toBe('(root)');
    expect(findVisibleCollapsedAncestor(
      'src/domain/model.ts',
      new Set(['test']),
    )).toBeUndefined();
  });
});
