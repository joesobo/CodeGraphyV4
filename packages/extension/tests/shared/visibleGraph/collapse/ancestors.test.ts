import { describe, expect, it } from 'vitest';
import {
  findVisibleCollapsedAncestor,
  isDescendantOf,
} from '../../../../src/shared/visibleGraph/collapse/ancestors';

describe('shared/visibleGraph/collapse/ancestors', () => {
  it('treats only nested paths as descendants', () => {
    expect(isDescendantOf('src', 'src/app.ts')).toBe(true);
    expect(isDescendantOf('src', 'src')).toBe(false);
    expect(isDescendantOf('src', 'src-old/app.ts')).toBe(false);
  });

  it('treats root as ancestor for every non-root node', () => {
    expect(isDescendantOf('(root)', 'src/app.ts')).toBe(true);
    expect(isDescendantOf('(root)', '(root)')).toBe(false);
  });

  it('returns the shallowest collapsed ancestor that hides the node', () => {
    const collapsedFolderIds = new Set(['src/components', 'src']);

    expect(findVisibleCollapsedAncestor('src/components/Button.ts', collapsedFolderIds)).toBe('src');
    expect(findVisibleCollapsedAncestor('src/components', collapsedFolderIds)).toBe('src');
  });

  it('keeps the collapsed node itself visible when no parent is collapsed', () => {
    expect(findVisibleCollapsedAncestor('src', new Set(['src']))).toBe('src');
  });

  it('prefers a collapsed root over any nested collapsed folders', () => {
    expect(findVisibleCollapsedAncestor('src/app.ts', new Set(['src', '(root)']))).toBe('(root)');
  });

  it('returns undefined when no collapsed folder owns the node', () => {
    expect(findVisibleCollapsedAncestor('lib/util.ts', new Set(['src']))).toBeUndefined();
  });
});
