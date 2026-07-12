import { describe, expect, it } from 'vitest';
import { buildGraphContextMenuEntries } from '../../../../../src/webview/components/graph/contextMenu/build/entries';
import type { GraphContextMenuEntry } from '../../../../../src/webview/components/graph/contextMenu/contracts';
import {
  makeNodeContextSelection,
} from '../../../../../src/webview/components/graph/contextMenu/selection';

type ItemEntry = Extract<GraphContextMenuEntry, { kind: 'item' }>;

function isItemEntry(entry: GraphContextMenuEntry): entry is ItemEntry {
  return entry.kind === 'item';
}

function itemLabels(entries: readonly GraphContextMenuEntry[]): string[] {
  return entries
    .filter(isItemEntry)
    .map(entry => entry.label);
}

function disabledLabels(entries: readonly GraphContextMenuEntry[]): string[] {
  return entries
    .filter((entry): entry is ItemEntry => isItemEntry(entry) && entry.disabled === true)
    .map(entry => entry.label);
}

const immutableFolderLabels = [
  'New File',
  'New Folder',
  'Reveal in Explorer',
  'Copy Relative Path',
  'Copy Absolute Path',
  'Add to Favorites',
  'Focus Node',
  'Add Filter Pattern',
  'Add Legend Group',
  'Rename Folder',
  'Delete Folder',
];

describe('graph/contextMenu/build/node', () => {
  it('builds enabled folder mutation actions', () => {
    const entries = buildGraphContextMenuEntries({
      selection: makeNodeContextSelection('src', new Set()),
      favorites: new Set(),
      pluginItems: [],
      nodes: [{ id: 'src', nodeType: 'folder' }],
    });

    expect(itemLabels(entries)).toEqual(immutableFolderLabels);
    expect(disabledLabels(entries)).toEqual([]);
  });

  it('builds single-file node actions from inferred file targets', () => {
    const entries = buildGraphContextMenuEntries({
      selection: makeNodeContextSelection('src/app.ts', new Set()),
      favorites: new Set(),
      pluginItems: [],
    });

    expect(itemLabels(entries)).toContain('Open File');
    expect(itemLabels(entries)).toContain('Delete File');
  });

  it('builds child creation actions from a single folder context', () => {
    const entries = buildGraphContextMenuEntries({
      selection: makeNodeContextSelection('src', new Set()),
      favorites: new Set(),
      pluginItems: [],
      nodes: [{ id: 'src', nodeType: 'folder' }],
    });

    expect(itemLabels(entries)).toContain('New File');
    expect(itemLabels(entries)).toContain('New Folder');
  });

  it('builds multi-file node actions from the selected targets', () => {
    const entries = buildGraphContextMenuEntries({
      selection: makeNodeContextSelection('src/a.ts', new Set(['src/a.ts', 'src/b.ts'])),
      favorites: new Set(),
      pluginItems: [],
    });

    expect(itemLabels(entries)).toHaveLength(5);
    expect(itemLabels(entries)).toEqual([
      'Open 2 Files',
      'Copy Relative Paths',
      'Add All to Favorites',
      'Add Filter Patterns',
      'Delete 2 Files',
    ]);
  });

  it('keeps mixed selections with plugin nodes on generic public actions', () => {
    const entries = buildGraphContextMenuEntries({
      selection: makeNodeContextSelection('src/app.ts', new Set(['src/app.ts', 'src', 'plugin-node'])),
      favorites: new Set(),
      pluginItems: [],
      nodes: [
        { id: 'src/app.ts', nodeType: 'file' },
        { id: 'src', nodeType: 'folder' },
        { id: 'plugin-node', nodeType: 'example-widget', ownerPluginId: 'plugin.example' },
      ],
    });

    expect(itemLabels(entries)).toEqual([
      'Open 3 Files',
      'Copy Relative Paths',
      'Add All to Favorites',
      'Add Filter Patterns',
      'Delete 3 Files',
    ]);
  });

  it('returns no entries for an empty node selection', () => {
    expect(buildGraphContextMenuEntries({
      selection: { kind: 'node', targets: [] },
      favorites: new Set(),
      pluginItems: [],
    })).toEqual([]);
  });
});
