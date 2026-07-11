import { describe, it, expect } from 'vitest';
import { buildBackgroundEntries } from '../../../../../src/webview/components/graph/contextMenu/background/entries';
import type { GraphContextMenuEntry } from '../../../../../src/webview/components/graph/contextMenu/contracts';

type ItemEntry = Extract<GraphContextMenuEntry, { kind: 'item' }>;

function getItems(entries: GraphContextMenuEntry[]): ItemEntry[] {
  return entries.filter((e): e is ItemEntry => e.kind === 'item');
}

describe('buildBackgroundEntries (mutation kill tests)', () => {
  /**
   * Kill L7:30 StringLiteral: "" — mutant replaces 'New File' with ''
   * Kill L8:28 StringLiteral: "" — mutant replaces 'createFile' action with ''
   * Verify exact label AND action strings for the "New File" entry.
   */
  it('produces exact label "New File" with action "createFile" when mutation is enabled', () => {
    const entries = buildBackgroundEntries('enabled');
    const items = getItems(entries);
    const newFileItem = items.find(item => item.id === 'background-create-file');

    expect(newFileItem).toBeDefined();
    expect(newFileItem!.label).toBe('New File');
    expect(newFileItem!.action).toEqual({ kind: 'builtin', action: 'createFile' });
  });

  /**
   * Kill L11:17 StringLiteral: "" — mutant replaces 'Refresh' with ''
   * Kill L12:17 StringLiteral: "" — mutant replaces 'Fit All Nodes' with ''
   * Verify exact label AND action strings for Refresh and Fit entries.
   */
  it('produces exact label "Refresh" with action "refresh"', () => {
    const entries = buildBackgroundEntries('enabled');
    const items = getItems(entries);
    const refreshItem = items.find(item => item.id === 'background-refresh');

    expect(refreshItem).toBeDefined();
    expect(refreshItem!.label).toBe('Refresh');
    expect(refreshItem!.action).toEqual({ kind: 'builtin', action: 'refresh' });
  });

  it('produces exact label "Fit All Nodes" with action "fitView"', () => {
    const entries = buildBackgroundEntries('enabled');
    const items = getItems(entries);
    const fitItem = items.find(item => item.id === 'background-fit');

    expect(fitItem).toBeDefined();
    expect(fitItem!.label).toBe('Fit All Nodes');
    expect(fitItem!.action).toEqual({ kind: 'builtin', action: 'fitView' });
  });

  it('keeps creation actions visible but disabled when mutation is disabled', () => {
    const entries = buildBackgroundEntries('disabled');
    const items = getItems(entries);

    expect(items).toHaveLength(5);
    expect(items[0].label).toBe('New File');
    expect(items[0].action).toEqual({ kind: 'builtin', action: 'createFile' });
    expect(items[0].disabled).toBe(true);
    expect(items[1].label).toBe('New Folder');
    expect(items[1].action).toEqual({ kind: 'builtin', action: 'createFolder' });
    expect(items[1].disabled).toBe(true);
    expect(items[2].label).toBe('Paste');
    expect(items[2].action).toEqual({ kind: 'builtin', action: 'pasteFiles' });
    expect(items[2].disabled).toBe(true);
    expect(items[3].label).toBe('Refresh');
    expect(items[3].action).toEqual({ kind: 'builtin', action: 'refresh' });
    expect(items[4].label).toBe('Fit All Nodes');
    expect(items[4].action).toEqual({ kind: 'builtin', action: 'fitView' });
  });

  it('uses non-empty id strings for all entries', () => {
    const entries = buildBackgroundEntries('enabled');
    for (const entry of entries) {
      expect(entry.id).not.toBe('');
      expect(entry.id.length).toBeGreaterThan(0);
    }
  });
});
