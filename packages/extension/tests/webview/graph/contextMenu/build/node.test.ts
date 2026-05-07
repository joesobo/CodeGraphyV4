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
  'New File...',
  'New Folder...',
  'Reveal in Explorer',
  'Copy Relative Path',
  'Copy Absolute Path',
  'Add to Favorites',
  'Focus Node',
  'Add Filter Pattern...',
  'Add Legend Group...',
  'Rename Folder...',
  'Delete Folder',
];

const immutableFolderDisabledLabels = [
  'New File...',
  'New Folder...',
  'Rename Folder...',
  'Delete Folder',
];

describe('graph/contextMenu/build/node', () => {
  it('builds disabled folder mutation actions when the Graph Revision is immutable', () => {
    const entries = buildGraphContextMenuEntries({
      selection: makeNodeContextSelection('src', new Set()),
      timelineActive: true,
      mutationAvailability: 'disabled',
      favorites: new Set(),
      pluginItems: [],
      nodes: [{ id: 'src', nodeType: 'folder' }],
    });

    expect(itemLabels(entries)).toEqual(immutableFolderLabels);
    expect(disabledLabels(entries)).toEqual(immutableFolderDisabledLabels);
  });

  it('builds single-file node actions from inferred file targets', () => {
    const entries = buildGraphContextMenuEntries({
      selection: makeNodeContextSelection('src/app.ts', new Set()),
      timelineActive: false,
      favorites: new Set(),
      pluginItems: [],
    });

    expect(itemLabels(entries)).toContain('Open File');
    expect(itemLabels(entries)).toContain('Delete File');
    expect(itemLabels(entries)).toContain('Create Graph Section from Selection');
  });

  it('builds multi-file node actions from the selected targets', () => {
    const entries = buildGraphContextMenuEntries({
      selection: makeNodeContextSelection('src/a.ts', new Set(['src/a.ts', 'src/b.ts'])),
      timelineActive: false,
      favorites: new Set(),
      pluginItems: [],
    });

    expect(itemLabels(entries)).toHaveLength(7);
    expect(itemLabels(entries)).toEqual([
      'Open 2 Files',
      'Copy Relative Paths',
      'Add All to Favorites',
      'Pin Nodes',
      'Add Filter Patterns...',
      'Create Graph Section from Selection',
      'Delete 2 Files',
    ]);
  });

  it('returns no entries for an empty node selection', () => {
    expect(buildGraphContextMenuEntries({
      selection: { kind: 'node', targets: [] },
      timelineActive: false,
      favorites: new Set(),
      pluginItems: [],
    })).toEqual([]);
  });
});
