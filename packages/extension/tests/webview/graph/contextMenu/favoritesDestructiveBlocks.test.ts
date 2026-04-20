import { describe, it, expect } from 'vitest';
import {
  buildFavoriteBlock,
} from '../../../../src/webview/components/graph/contextMenu/node/destructive/favoritesBlocks';
import {
  buildDestructiveBlock,
  buildFilterBlock,
} from '../../../../src/webview/components/graph/contextMenu/node/destructive/block';
import type { GraphContextMenuEntry } from '../../../../src/webview/components/graph/contextMenu/contracts';

function itemLabels(entries: GraphContextMenuEntry[]): string[] {
  return entries
    .filter(entry => entry.kind === 'item')
    .map(entry => (entry as Extract<GraphContextMenuEntry, { kind: 'item' }>).label);
}

function findItem(entries: GraphContextMenuEntry[], label: string) {
  return entries.find(
    e => e.kind === 'item' && (e as Extract<GraphContextMenuEntry, { kind: 'item' }>).label === label
  ) as Extract<GraphContextMenuEntry, { kind: 'item' }> | undefined;
}

describe('buildFavoriteBlock', () => {
  it('starts with a separator', () => {
    const entries = buildFavoriteBlock(['a.ts'], new Set());
    expect(entries[0].kind).toBe('separator');
    expect(entries[0].id).toBe('node-separator-favorites');
  });

  it('shows "Add to Favorites" when single target is not favorited', () => {
    const labels = itemLabels(buildFavoriteBlock(['a.ts'], new Set()));
    expect(labels).toContain('Add to Favorites');
  });

  it('shows "Remove from Favorites" when single target is favorited', () => {
    const labels = itemLabels(buildFavoriteBlock(['a.ts'], new Set(['a.ts'])));
    expect(labels).toContain('Remove from Favorites');
  });

  it('shows "Add All to Favorites" when not all multi-targets are favorited', () => {
    const labels = itemLabels(buildFavoriteBlock(['a.ts', 'b.ts'], new Set(['a.ts'])));
    expect(labels).toContain('Add All to Favorites');
  });

  it('shows "Remove All from Favorites" when all multi-targets are favorited', () => {
    const labels = itemLabels(buildFavoriteBlock(['a.ts', 'b.ts'], new Set(['a.ts', 'b.ts'])));
    expect(labels).toContain('Remove All from Favorites');
  });

  it('includes Focus Node for single target', () => {
    const labels = itemLabels(buildFavoriteBlock(['a.ts'], new Set()));
    expect(labels).toContain('Focus Node');
  });

  it('omits Focus Node for multi-select', () => {
    const labels = itemLabels(buildFavoriteBlock(['a.ts', 'b.ts'], new Set()));
    expect(labels).not.toContain('Focus Node');
  });

  it('shows "Add All to Favorites" for empty favorites set with multiple targets', () => {
    const labels = itemLabels(buildFavoriteBlock(['a.ts', 'b.ts'], new Set()));
    expect(labels).toContain('Add All to Favorites');
  });

  it('uses toggleFavorite action for the favorite toggle entry', () => {
    const entries = buildFavoriteBlock(['a.ts'], new Set());
    const favoriteEntry = findItem(entries, 'Add to Favorites');
    expect(favoriteEntry?.action).toMatchObject({ kind: 'builtin', action: 'toggleFavorite' });
  });

  it('uses focus action for the Focus Node entry', () => {
    const entries = buildFavoriteBlock(['a.ts'], new Set());
    const focusEntry = findItem(entries, 'Focus Node');
    expect(focusEntry?.action).toMatchObject({ kind: 'builtin', action: 'focus' });
  });
});

describe('buildDestructiveBlock', () => {
  it('starts with a separator', () => {
    const entries = buildDestructiveBlock(['a.ts']);
    expect(entries[0].kind).toBe('separator');
  });

  it('includes Rename for single target', () => {
    const labels = itemLabels(buildDestructiveBlock(['a.ts']));
    expect(labels).toContain('Rename...');
  });

  it('omits Rename for multi-select', () => {
    const labels = itemLabels(buildDestructiveBlock(['a.ts', 'b.ts']));
    expect(labels).not.toContain('Rename...');
  });

  it('includes Delete File for single target', () => {
    const labels = itemLabels(buildDestructiveBlock(['a.ts']));
    expect(labels).toContain('Delete File');
  });

  it('includes Delete N Files for multi-select with correct count', () => {
    const labels = itemLabels(buildDestructiveBlock(['a.ts', 'b.ts', 'c.ts']));
    expect(labels).toContain('Delete 3 Files');
  });

  it('marks the delete entry as destructive', () => {
    const entries = buildDestructiveBlock(['a.ts']);
    const deleteEntry = findItem(entries, 'Delete File');
    expect(deleteEntry?.destructive).toBe(true);
  });
});

describe('buildFilterBlock', () => {
  it('starts with a separator', () => {
    const entries = buildFilterBlock(['a.ts']);
    expect(entries[0].kind).toBe('separator');
    expect(entries[0].id).toBe('node-separator-filter');
  });

  it('includes Add to Filter for single target', () => {
    const labels = itemLabels(buildFilterBlock(['a.ts']));
    expect(labels).toContain('Add to Filter');
  });

  it('includes Add All to Filter for multi-select', () => {
    const labels = itemLabels(buildFilterBlock(['a.ts', 'b.ts']));
    expect(labels).toContain('Add All to Filter');
  });

  it('contains one separator in the filter block', () => {
    const entries = buildFilterBlock(['a.ts']);
    const separators = entries.filter(e => e.kind === 'separator');
    expect(separators).toHaveLength(1);
  });
});
