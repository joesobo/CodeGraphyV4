import { describe, it, expect } from 'vitest';
import { buildDestructiveBlock } from '../../../../src/webview/components/graph/contextMenu/node/destructiveBlock';
import type { GraphContextMenuEntry } from '../../../../src/webview/components/graph/contextMenu/contracts';

type ItemEntry = Extract<GraphContextMenuEntry, { kind: 'item' }>;

function getItems(entries: GraphContextMenuEntry[]): ItemEntry[] {
  return entries.filter((e): e is ItemEntry => e.kind === 'item');
}

describe('buildDestructiveBlock (mutation kill tests)', () => {
  /**
   * Kill L16:17 StringLiteral: "" — mutant replaces 'addToFilter' with ''
   * Verify exact action string for the Add to Filter entry.
   */
  it('produces action "addToFilter" for single-target filter entry', () => {
    const entries = buildDestructiveBlock(['a.ts']);
    const items = getItems(entries);
    const filterItem = items.find(item => item.id === 'node-add-filter');

    expect(filterItem).toBeDefined();
    expect(filterItem!.label).toBe('Add to Filter');
    expect(filterItem!.action).toEqual({ kind: 'builtin', action: 'addToFilter' });
  });

  it('produces action "addToFilter" for multi-select filter entry', () => {
    const entries = buildDestructiveBlock(['a.ts', 'b.ts']);
    const items = getItems(entries);
    const filterItem = items.find(item => item.id === 'node-add-filter');

    expect(filterItem).toBeDefined();
    expect(filterItem!.label).toBe('Add All to Filter');
    expect(filterItem!.action).toEqual({ kind: 'builtin', action: 'addToFilter' });
  });

  /**
   * Kill L21:30 StringLiteral: "" — mutant replaces 'rename' with ''
   * Verify exact action string for the Rename entry.
   */
  it('produces action "rename" for the rename entry', () => {
    const entries = buildDestructiveBlock(['a.ts']);
    const items = getItems(entries);
    const renameItem = items.find(item => item.id === 'node-rename');

    expect(renameItem).toBeDefined();
    expect(renameItem!.label).toBe('Rename...');
    expect(renameItem!.action).toEqual({ kind: 'builtin', action: 'rename' });
  });

  /**
   * Kill L25:17 StringLiteral: "" — mutant replaces 'delete' with ''
   * Verify exact action string for the Delete entry.
   */
  it('produces action "delete" for the delete entry (single target)', () => {
    const entries = buildDestructiveBlock(['a.ts']);
    const items = getItems(entries);
    const deleteItem = items.find(item => item.id === 'node-delete');

    expect(deleteItem).toBeDefined();
    expect(deleteItem!.label).toBe('Delete File');
    expect(deleteItem!.action).toEqual({ kind: 'builtin', action: 'delete' });
    expect(deleteItem!.destructive).toBe(true);
  });

  it('produces action "delete" for the delete entry (multi-select)', () => {
    const entries = buildDestructiveBlock(['a.ts', 'b.ts']);
    const items = getItems(entries);
    const deleteItem = items.find(item => item.id === 'node-delete');

    expect(deleteItem).toBeDefined();
    expect(deleteItem!.label).toBe('Delete 2 Files');
    expect(deleteItem!.action).toEqual({ kind: 'builtin', action: 'delete' });
  });

  it('has non-empty action strings for all item entries', () => {
    const entries = buildDestructiveBlock(['a.ts']);
    const items = getItems(entries);

    for (const item of items) {
      expect(item.action.kind).toBe('builtin');
      if (item.action.kind === 'builtin') {
        expect(item.action.action).not.toBe('');
        expect(item.action.action.length).toBeGreaterThan(0);
      }
      expect(item.label).not.toBe('');
    }
  });
});
