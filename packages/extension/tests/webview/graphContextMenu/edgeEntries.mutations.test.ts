import { describe, it, expect } from 'vitest';
import { buildEdgeEntries } from '../../../src/webview/components/graphContextMenu/edgeEntries';
import type { GraphContextMenuEntry } from '../../../src/webview/components/graphContextMenu/types';

type ItemEntry = Extract<GraphContextMenuEntry, { kind: 'item' }>;

function getItems(entries: GraphContextMenuEntry[]): ItemEntry[] {
  return entries.filter((e): e is ItemEntry => e.kind === 'item');
}

describe('buildEdgeEntries (mutation kill tests)', () => {
  /**
   * Kill L9:30 StringLiteral: "" — mutant replaces 'copyEdgeSource' with ''
   * Kill L12:30 StringLiteral: "" — mutant replaces 'copyEdgeTarget' with ''
   * Kill L15:30 StringLiteral: "" — mutant replaces 'copyEdgeBoth' with ''
   *
   * Verify exact action strings for each entry.
   */
  it('produces action "copyEdgeSource" for Copy Source Path entry', () => {
    const entries = buildEdgeEntries(['a.ts', 'b.ts']);
    const items = getItems(entries);
    const sourceItem = items.find(item => item.id === 'edge-copy-source');

    expect(sourceItem).toBeDefined();
    expect(sourceItem!.action).toEqual({ kind: 'builtin', action: 'copyEdgeSource' });
    expect(sourceItem!.label).toBe('Copy Source Path');
  });

  it('produces action "copyEdgeTarget" for Copy Target Path entry', () => {
    const entries = buildEdgeEntries(['a.ts', 'b.ts']);
    const items = getItems(entries);
    const targetItem = items.find(item => item.id === 'edge-copy-target');

    expect(targetItem).toBeDefined();
    expect(targetItem!.action).toEqual({ kind: 'builtin', action: 'copyEdgeTarget' });
    expect(targetItem!.label).toBe('Copy Target Path');
  });

  it('produces action "copyEdgeBoth" for Copy Both Paths entry', () => {
    const entries = buildEdgeEntries(['a.ts', 'b.ts']);
    const items = getItems(entries);
    const bothItem = items.find(item => item.id === 'edge-copy-both');

    expect(bothItem).toBeDefined();
    expect(bothItem!.action).toEqual({ kind: 'builtin', action: 'copyEdgeBoth' });
    expect(bothItem!.label).toBe('Copy Both Paths');
  });

  it('has non-empty action strings for all entries', () => {
    const entries = buildEdgeEntries(['a.ts', 'b.ts']);
    const items = getItems(entries);

    for (const item of items) {
      expect(item.action.kind).toBe('builtin');
      if (item.action.kind === 'builtin') {
        expect(item.action.action).not.toBe('');
        expect(item.action.action.length).toBeGreaterThan(0);
      }
    }
  });

  it('has non-empty label strings for all entries', () => {
    const entries = buildEdgeEntries(['a.ts', 'b.ts']);
    const items = getItems(entries);

    for (const item of items) {
      expect(item.label).not.toBe('');
      expect(item.label.length).toBeGreaterThan(0);
    }
  });
});
