import { describe, it, expect } from 'vitest';
import { buildDestructiveBlock } from '../../../../src/webview/components/graph/contextMenu/node/destructiveBlock';
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

describe('destructiveBlock', () => {
  it('begins with a separator', () => {
    const entries = buildDestructiveBlock(['a.ts']);
    expect(entries[0]).toEqual({ kind: 'separator', id: 'node-separator-destructive-1' });
  });

  it('has a second separator after the add-to-filter item', () => {
    const entries = buildDestructiveBlock(['a.ts']);
    expect(entries[2]).toEqual({ kind: 'separator', id: 'node-separator-destructive-2' });
  });

  it('includes Add to Filter for single target', () => {
    expect(itemLabels(buildDestructiveBlock(['a.ts']))).toContain('Add to Filter');
  });

  it('includes Add All to Filter for multi-select', () => {
    expect(itemLabels(buildDestructiveBlock(['a.ts', 'b.ts']))).toContain('Add All to Filter');
  });

  it('includes Rename for single target', () => {
    expect(itemLabels(buildDestructiveBlock(['a.ts']))).toContain('Rename...');
  });

  it('omits Rename for multi-select', () => {
    expect(itemLabels(buildDestructiveBlock(['a.ts', 'b.ts']))).not.toContain('Rename...');
  });

  it('shows Delete File for single target', () => {
    expect(itemLabels(buildDestructiveBlock(['a.ts']))).toContain('Delete File');
  });

  it('shows Delete N Files with correct count for multi-select', () => {
    expect(itemLabels(buildDestructiveBlock(['a.ts', 'b.ts', 'c.ts']))).toContain('Delete 3 Files');
  });

  it('marks the delete entry as destructive', () => {
    const entry = findItem(buildDestructiveBlock(['a.ts']), 'Delete File');
    expect(entry?.destructive).toBe(true);
  });

  it('uses addToFilter action for the filter entry', () => {
    const entry = findItem(buildDestructiveBlock(['a.ts']), 'Add to Filter');
    expect(entry?.action).toMatchObject({ kind: 'builtin', action: 'addToFilter' });
  });

  it('uses rename action for the rename entry', () => {
    const entry = findItem(buildDestructiveBlock(['a.ts']), 'Rename...');
    expect(entry?.action).toMatchObject({ kind: 'builtin', action: 'rename' });
  });

  it('uses delete action for the delete entry', () => {
    const entry = findItem(buildDestructiveBlock(['a.ts']), 'Delete File');
    expect(entry?.action).toMatchObject({ kind: 'builtin', action: 'delete' });
  });
});
