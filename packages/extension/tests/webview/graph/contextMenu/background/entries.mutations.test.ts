import { describe, expect, it } from 'vitest';
import { buildBackgroundEntries } from '../../../../../src/webview/components/graph/contextMenu/background/entries';
import type { GraphContextMenuEntry } from '../../../../../src/webview/components/graph/contextMenu/contracts';

type ItemEntry = Extract<GraphContextMenuEntry, { kind: 'item' }>;

function getItems(entries: GraphContextMenuEntry[]): ItemEntry[] {
  return entries.filter((entry): entry is ItemEntry => entry.kind === 'item');
}

describe('buildBackgroundEntries mutation coverage', () => {
  it('produces the exact New File label and action', () => {
    const entry = getItems(buildBackgroundEntries())
      .find(item => item.id === 'background-create-file');

    expect(entry?.label).toBe('New File');
    expect(entry?.action).toEqual({ kind: 'builtin', action: 'createFile' });
  });

  it('produces the exact Refresh label and action', () => {
    const entry = getItems(buildBackgroundEntries())
      .find(item => item.id === 'background-refresh');

    expect(entry?.label).toBe('Refresh');
    expect(entry?.action).toEqual({ kind: 'builtin', action: 'refresh' });
  });

  it('produces the exact Fit All Nodes label and action', () => {
    const entry = getItems(buildBackgroundEntries())
      .find(item => item.id === 'background-fit');

    expect(entry?.label).toBe('Fit All Nodes');
    expect(entry?.action).toEqual({ kind: 'builtin', action: 'fitView' });
  });

  it('uses non-empty stable ids for every item', () => {
    expect(getItems(buildBackgroundEntries()).map(item => item.id)).toEqual([
      'background-create-file',
      'background-create-folder',
      'background-refresh',
      'background-fit',
    ]);
  });
});
