import { describe, expect, it } from 'vitest';
import { getGraphContextActionEffects } from '../../../../src/webview/components/graph/contextActions/effects';
import { resolveGraphContextActionContext } from '../../../../src/webview/components/graph/contextActions/context';
import { buildGraphContextMenuEntries } from '../../../../src/webview/components/graph/contextMenu/build/entries';
import type {
  BuiltInContextMenuAction,
  GraphContextMenuEntry,
} from '../../../../src/webview/components/graph/contextMenu/contracts';
import {
  makeBackgroundContextSelection,
  makeEdgeContextSelection,
  makeNodeContextSelection,
} from '../../../../src/webview/components/graph/contextMenu/selection';

type MenuItem = Extract<GraphContextMenuEntry, { kind: 'item' }>;

function menuItems(entries: readonly GraphContextMenuEntry[]): MenuItem[] {
  return entries.filter((entry): entry is MenuItem => entry.kind === 'item');
}

function labels(entries: readonly GraphContextMenuEntry[]): string[] {
  return menuItems(entries).map(entry => entry.label);
}

function builtInItem(
  entries: readonly GraphContextMenuEntry[],
  action: BuiltInContextMenuAction,
): MenuItem {
  const entry = menuItems(entries).find(item =>
    item.action.kind === 'builtin' && item.action.action === action
  );
  if (!entry) {
    throw new Error(`Expected ${action} menu item`);
  }
  return entry;
}

function expectBuiltInDisabled(
  entries: readonly GraphContextMenuEntry[],
  action: BuiltInContextMenuAction,
  disabled: boolean,
): void {
  expect(builtInItem(entries, action).disabled ?? false).toBe(disabled);
}

describe('graph/contextMenu product scenarios', () => {
  it('shows live background creation actions enabled', () => {
    const entries = buildGraphContextMenuEntries({
      selection: makeBackgroundContextSelection(),
      timelineActive: false,
      favorites: new Set(),
      pluginItems: [],
    });

    expect(labels(entries)).toEqual(['New File', 'New Folder', 'Paste', 'Refresh', 'Fit All Nodes']);
    expectBuiltInDisabled(entries, 'createFile', false);
    expectBuiltInDisabled(entries, 'createFolder', false);
  });

  it('keeps historical background creation actions visible but disabled', () => {
    const entries = buildGraphContextMenuEntries({
      selection: makeBackgroundContextSelection(),
      timelineActive: true,
      mutationAvailability: 'disabled',
      favorites: new Set(),
      pluginItems: [],
    });

    expect(labels(entries)).toEqual(['New File', 'New Folder', 'Paste', 'Refresh', 'Fit All Nodes']);
    expectBuiltInDisabled(entries, 'createFile', true);
    expectBuiltInDisabled(entries, 'createFolder', true);
    expectBuiltInDisabled(entries, 'refresh', false);
    expectBuiltInDisabled(entries, 'fitView', false);
  });

  it('leaves historical File Nodes inspectable but not mutable', () => {
    const entries = buildGraphContextMenuEntries({
      selection: makeNodeContextSelection('src/app.ts', new Set<string>()),
      timelineActive: true,
      mutationAvailability: 'disabled',
      favorites: new Set(['src/app.ts']),
      pluginItems: [],
    });

    expect(labels(entries)).toEqual([
      'Open File',
      'Open to the Side',
      'Open With…',
      'Close Editor',
      'Cut',
      'Copy',
      'Copy Relative Path',
      'Copy Absolute Path',
      'Remove from Favorites',
      'Focus Node',
      'Add Filter Pattern',
      'Add Legend Group',
      'Rename',
      'Delete File',
    ]);
    expectBuiltInDisabled(entries, 'open', false);
    expectBuiltInDisabled(entries, 'copyRelative', false);
    expectBuiltInDisabled(entries, 'toggleFavorite', false);
    expectBuiltInDisabled(entries, 'rename', true);
    expectBuiltInDisabled(entries, 'delete', true);
  });

  it('offers Folder Node child creation and folder mutation in the current Graph Revision', () => {
    const entries = buildGraphContextMenuEntries({
      selection: makeNodeContextSelection('src', new Set<string>()),
      timelineActive: false,
      favorites: new Set<string>(),
      pluginItems: [],
      nodes: [{ id: 'src', label: 'src', color: '#94a3b8', nodeType: 'folder' }],
    });

    expect(labels(entries)).toContain('New File');
    expect(labels(entries)).toContain('New Folder');
    expect(labels(entries)).toContain('Rename Folder');
    expect(labels(entries)).toContain('Delete Folder');
    expectBuiltInDisabled(entries, 'createFile', false);
    expectBuiltInDisabled(entries, 'createFolder', false);
    expectBuiltInDisabled(entries, 'rename', false);
    expectBuiltInDisabled(entries, 'delete', false);
  });

  it('routes Edge source and target actions through resolved action context', () => {
    const selection = makeEdgeContextSelection(
      'src/source.ts->src/target.ts',
      'src/source.ts',
      'src/target.ts',
    );
    const entries = buildGraphContextMenuEntries({
      selection,
      timelineActive: false,
      favorites: new Set<string>(),
      pluginItems: [],
    });
    const actionContext = resolveGraphContextActionContext(selection);

    expect(getGraphContextActionEffects(builtInItem(entries, 'openEdgeSource').action, actionContext))
      .toEqual([{ kind: 'openFile', path: 'src/source.ts' }]);
    expect(getGraphContextActionEffects(builtInItem(entries, 'openEdgeTarget').action, actionContext))
      .toEqual([{ kind: 'openFile', path: 'src/target.ts' }]);
    expect(getGraphContextActionEffects(builtInItem(entries, 'copyEdgeBoth').action, actionContext))
      .toEqual([{
        kind: 'postMessage',
        message: {
          type: 'COPY_TO_CLIPBOARD',
          payload: { text: 'src/source.ts\nsrc/target.ts' },
        },
      }]);
  });

  it('limits mixed node selections to bulk-safe actions', () => {
    const entries = buildGraphContextMenuEntries({
      selection: makeNodeContextSelection('src/app.ts', new Set(['src/app.ts', 'src'])),
      timelineActive: true,
      mutationAvailability: 'disabled',
      favorites: new Set<string>(),
      pluginItems: [],
      nodes: [
        { id: 'src/app.ts', label: 'app.ts', color: '#93c5fd', nodeType: 'file' },
        { id: 'src', label: 'src', color: '#94a3b8', nodeType: 'folder' },
      ],
    });

    expect(labels(entries)).toEqual([
      'Open 2 Files',
      'Open to the Side',
      'Select for Compare',
      'Cut',
      'Copy',
      'Copy Relative Paths',
      'Add All to Favorites',
      'Add Filter Patterns',
      'Rename',
      'Delete 2 Files',
    ]);
    expect(labels(entries)).not.toContain('Focus Node');
    expectBuiltInDisabled(entries, 'rename', true);
    expect(labels(entries)).not.toContain('Add Legend Group');
    expectBuiltInDisabled(entries, 'delete', true);
  });
});
