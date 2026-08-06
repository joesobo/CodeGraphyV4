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
      nodes: [{ id: 'src', nodeType: 'folder' }],
    });

    expect(itemLabels(entries)).toEqual(immutableFolderLabels);
    expect(disabledLabels(entries)).toEqual([]);
  });

  it('builds single-file node actions from inferred file targets', () => {
    const entries = buildGraphContextMenuEntries({
      selection: makeNodeContextSelection('src/app.ts', new Set()),
      favorites: new Set(),
      nodes: [{ id: 'src/app.ts', label: 'App' }],
    });

    expect(entries[0]).toEqual({
      kind: 'header',
      id: 'context-target-header',
      header: {
        kind: 'node',
        target: { label: 'App', exactId: 'src/app.ts' },
      },
    });
    expect(entries[1]).toMatchObject({ kind: 'separator' });
    expect(itemLabels(entries)).toContain('Open File');
    expect(itemLabels(entries)).toContain('Delete File');
  });

  it('builds child creation actions from a single folder context', () => {
    const entries = buildGraphContextMenuEntries({
      selection: makeNodeContextSelection('src', new Set()),
      favorites: new Set(),
      nodes: [{ id: 'src', nodeType: 'folder' }],
    });

    expect(itemLabels(entries)).toContain('New File');
    expect(itemLabels(entries)).toContain('New Folder');
  });

  it('builds multi-file node actions from the selected targets', () => {
    const entries = buildGraphContextMenuEntries({
      selection: makeNodeContextSelection('src/a.ts', new Set(['src/a.ts', 'src/b.ts'])),
      favorites: new Set(),
    });

    expect(entries[0]).toMatchObject({
      kind: 'header',
      header: { kind: 'multiNode', count: 2 },
    });
    expect(itemLabels(entries)).toHaveLength(6);
    expect(itemLabels(entries)).toEqual([
      'Open 2 Files',
      'Compare Selected',
      'Copy Relative Paths',
      'Add All to Favorites',
      'Add Filter Patterns',
      'Delete 2 Files',
    ]);
  });

  it('shows Compare Selected only for exactly two File Nodes', () => {
    const labelsFor = (
      targets: string[],
      nodes?: Array<{ id: string; nodeType?: string; symbol?: { id: string; name: string; filePath: string } }>,
    ): string[] => itemLabels(buildGraphContextMenuEntries({
      selection: { kind: 'node', targets },
      favorites: new Set(),
      nodes,
    }));

    expect(labelsFor(['src/a.ts', 'src/b.ts'])).toContain('Compare Selected');
    expect(labelsFor(['src/a.ts'])).not.toContain('Compare Selected');
    expect(labelsFor(['src/a.ts', 'src/b.ts', 'src/c.ts'])).not.toContain('Compare Selected');
    expect(labelsFor(['src', 'tests'], [
      { id: 'src', nodeType: 'folder' },
      { id: 'tests', nodeType: 'folder' },
    ])).not.toContain('Compare Selected');
    expect(labelsFor(['pkg:react', 'pkg:vitest'], [
      { id: 'pkg:react', nodeType: 'package' },
      { id: 'pkg:vitest', nodeType: 'package' },
    ])).not.toContain('Compare Selected');
    expect(labelsFor(['src/a.ts#run', 'src/b.ts#run'], [
      { id: 'src/a.ts#run', nodeType: 'symbol' },
      { id: 'src/b.ts#run', nodeType: 'symbol' },
    ])).not.toContain('Compare Selected');
    expect(labelsFor(['src/a.ts', 'src'], [
      { id: 'src/a.ts', nodeType: 'file' },
      { id: 'src', nodeType: 'folder' },
    ])).not.toContain('Compare Selected');
    expect(itemLabels(buildGraphContextMenuEntries({
      selection: {
        kind: 'edge',
        edgeId: 'src/a.ts->src/b.ts',
        targets: ['src/a.ts', 'src/b.ts'],
      },
      favorites: new Set(),
    }))).not.toContain('Compare Selected');
  });

  it('keeps mixed selections with plugin nodes on generic public actions', () => {
    const entries = buildGraphContextMenuEntries({
      selection: makeNodeContextSelection('src/app.ts', new Set(['src/app.ts', 'src', 'plugin-node'])),
      favorites: new Set(),
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
    })).toEqual([]);
  });
});
