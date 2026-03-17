import { describe, it, expect } from 'vitest';
import {
  buildFavoriteBlock,
} from '../../../src/webview/components/graphContextMenu/favoritesDestructiveBlocks';
import type { GraphContextMenuEntry } from '../../../src/webview/components/graphContextMenu/types';

type ItemEntry = Extract<GraphContextMenuEntry, { kind: 'item' }>;

function getItems(entries: GraphContextMenuEntry[]): ItemEntry[] {
  return entries.filter((e): e is ItemEntry => e.kind === 'item');
}

describe('buildFavoriteBlock (mutation kill tests)', () => {
  /**
   * Kill L12:24 ConditionalExpression: true — mutant replaces
   *   `targets.every(id => favorites.has(id))` with `true`.
   * This would make allFavorited always true, so the label would always
   * be "Remove from Favorites" even when targets are NOT favorited.
   *
   * Kill L12:24 EqualityOperator — mutant changes `targets.length > 0`
   * to something else. With empty targets and the mutant, allFavorited
   * could be wrong.
   */
  it('shows "Add to Favorites" when single target is NOT in favorites', () => {
    const entries = buildFavoriteBlock(['a.ts'], new Set());
    const items = getItems(entries);
    const toggleItem = items.find(item => item.id === 'node-toggle-favorite');

    expect(toggleItem).toBeDefined();
    expect(toggleItem!.label).toBe('Add to Favorites');
    // If mutant makes allFavorited=true, label would be "Remove from Favorites"
    expect(toggleItem!.label).not.toBe('Remove from Favorites');
  });

  it('shows "Remove from Favorites" when single target IS in favorites', () => {
    const entries = buildFavoriteBlock(['a.ts'], new Set(['a.ts']));
    const items = getItems(entries);
    const toggleItem = items.find(item => item.id === 'node-toggle-favorite');

    expect(toggleItem).toBeDefined();
    expect(toggleItem!.label).toBe('Remove from Favorites');
  });

  it('shows "Add All to Favorites" when NOT all multi-targets are favorited', () => {
    const entries = buildFavoriteBlock(['a.ts', 'b.ts'], new Set(['a.ts']));
    const items = getItems(entries);
    const toggleItem = items.find(item => item.id === 'node-toggle-favorite');

    expect(toggleItem).toBeDefined();
    expect(toggleItem!.label).toBe('Add All to Favorites');
    expect(toggleItem!.label).not.toBe('Remove All from Favorites');
  });

  it('shows "Remove All from Favorites" when ALL multi-targets are favorited', () => {
    const entries = buildFavoriteBlock(['a.ts', 'b.ts'], new Set(['a.ts', 'b.ts']));
    const items = getItems(entries);
    const toggleItem = items.find(item => item.id === 'node-toggle-favorite');

    expect(toggleItem).toBeDefined();
    expect(toggleItem!.label).toBe('Remove All from Favorites');
  });

  /**
   * Kill L18:7 StringLiteral: "" — mutant replaces 'toggleFavorite' with ''
   * Verify exact action string for the toggle favorite entry.
   */
  it('produces action "toggleFavorite" for the toggle entry', () => {
    const entries = buildFavoriteBlock(['a.ts'], new Set());
    const items = getItems(entries);
    const toggleItem = items.find(item => item.id === 'node-toggle-favorite');

    expect(toggleItem).toBeDefined();
    expect(toggleItem!.action).toEqual({ kind: 'builtin', action: 'toggleFavorite' });
    expect((toggleItem!.action as { kind: 'builtin'; action: string }).action).not.toBe('');
  });

  /**
   * Kill L27:30 StringLiteral: "" — mutant replaces 'focus' with ''
   * Verify exact action string for the Focus Node entry.
   */
  it('produces action "focus" for the Focus Node entry', () => {
    const entries = buildFavoriteBlock(['a.ts'], new Set());
    const items = getItems(entries);
    const focusItem = items.find(item => item.id === 'node-focus');

    expect(focusItem).toBeDefined();
    expect(focusItem!.label).toBe('Focus Node');
    expect(focusItem!.action).toEqual({ kind: 'builtin', action: 'focus' });
    expect((focusItem!.action as { kind: 'builtin'; action: string }).action).not.toBe('');
  });

  /**
   * Edge case: empty targets array.
   * L12: `targets.length > 0 && targets.every(...)` — with empty targets,
   * allFavorited should be false (because length > 0 is false).
   * EqualityOperator mutant might change `>` to `>=` or `<`, affecting this.
   */
  it('treats empty targets as not-all-favorited', () => {
    const entries = buildFavoriteBlock([], new Set(['a.ts']));
    const items = getItems(entries);
    const toggleItem = items.find(item => item.id === 'node-toggle-favorite');

    expect(toggleItem).toBeDefined();
    // With empty targets and allFavorited=false (targets.length > 0 fails),
    // the label should be the "add" variant (for multi since length=0 > 1 is false => single)
    expect(toggleItem!.label).toBe('Add to Favorites');
  });

  it('has non-empty action and label strings for all items', () => {
    const entries = buildFavoriteBlock(['a.ts'], new Set());
    const items = getItems(entries);

    for (const item of items) {
      expect(item.label).not.toBe('');
      expect(item.label.length).toBeGreaterThan(0);
      if (item.action.kind === 'builtin') {
        expect(item.action.action).not.toBe('');
        expect(item.action.action.length).toBeGreaterThan(0);
      }
    }
  });
});
