import { describe, it, expect } from 'vitest';
import type { IPluginContextMenuItem } from '../../src/shared/types';
import {
  buildGraphContextMenuEntries,
  makeBackgroundContextSelection,
  makeNodeContextSelection,
  type BuiltInContextMenuAction,
  type GraphContextMenuEntry,
} from '../../src/webview/components/graphContextMenu';

function menuItems(entries: GraphContextMenuEntry[]): Extract<GraphContextMenuEntry, { kind: 'item' }>[] {
  return entries.filter(entry => entry.kind === 'item');
}

function menuLabels(entries: GraphContextMenuEntry[]): string[] {
  return menuItems(entries).map(entry => entry.label);
}

function builtInActions(entries: GraphContextMenuEntry[]): BuiltInContextMenuAction[] {
  const actions: BuiltInContextMenuAction[] = [];
  for (const entry of menuItems(entries)) {
    if (entry.action.kind === 'builtin') {
      actions.push(entry.action.action);
    }
  }
  return actions;
}

describe('graphContextMenuModel', () => {
  it('builds background menu and hides destructive options in timeline', () => {
    const liveEntries = buildGraphContextMenuEntries({
      selection: makeBackgroundContextSelection(),
      timelineActive: false,
      favorites: new Set(),
      pluginItems: [],
    });
    expect(menuLabels(liveEntries)).toEqual(['New File...', 'Refresh Graph', 'Fit All Nodes']);

    const timelineEntries = buildGraphContextMenuEntries({
      selection: makeBackgroundContextSelection(),
      timelineActive: true,
      favorites: new Set(),
      pluginItems: [],
    });
    expect(menuLabels(timelineEntries)).toEqual(['Refresh Graph', 'Fit All Nodes']);
  });

  it('builds single-node menu with timeline filtering', () => {
    const selection = makeNodeContextSelection('src/app.ts', new Set<string>());
    const liveEntries = buildGraphContextMenuEntries({
      selection,
      timelineActive: false,
      favorites: new Set(['src/app.ts']),
      pluginItems: [],
    });

    expect(menuLabels(liveEntries)).toEqual([
      'Open File',
      'Reveal in Explorer',
      'Copy Relative Path',
      'Copy Absolute Path',
      'Remove from Favorites',
      'Focus Node',
      'Add to Filter',
      'Rename...',
      'Delete File',
    ]);

    const timelineEntries = buildGraphContextMenuEntries({
      selection,
      timelineActive: true,
      favorites: new Set(['src/app.ts']),
      pluginItems: [],
    });
    expect(menuLabels(timelineEntries)).toEqual([
      'Open File',
      'Copy Relative Path',
      'Copy Absolute Path',
      'Remove from Favorites',
      'Focus Node',
    ]);
  });

  it('builds multi-node menu with only valid actions', () => {
    const selection = makeNodeContextSelection('src/a.ts', new Set(['src/a.ts', 'src/b.ts']));
    const entries = buildGraphContextMenuEntries({
      selection,
      timelineActive: false,
      favorites: new Set(['src/a.ts']),
      pluginItems: [],
    });
    expect(menuLabels(entries)).toEqual([
      'Open 2 Files',
      'Copy Relative Paths',
      'Add All to Favorites',
      'Add All to Filter',
      'Delete 2 Files',
    ]);
  });

  it('maps all built-in actions by context variant', () => {
    const backgroundLive = buildGraphContextMenuEntries({
      selection: makeBackgroundContextSelection(),
      timelineActive: false,
      favorites: new Set(),
      pluginItems: [],
    });
    expect(builtInActions(backgroundLive)).toEqual(['createFile', 'refresh', 'fitView']);
    const fitViewItem = menuItems(backgroundLive).find(
      entry => entry.action.kind === 'builtin' && entry.action.action === 'fitView'
    );
    expect(fitViewItem?.shortcut).toBe('0');

    const backgroundTimeline = buildGraphContextMenuEntries({
      selection: makeBackgroundContextSelection(),
      timelineActive: true,
      favorites: new Set(),
      pluginItems: [],
    });
    expect(builtInActions(backgroundTimeline)).toEqual(['refresh', 'fitView']);

    const singleSelection = makeNodeContextSelection('src/app.ts', new Set<string>());
    const singleLive = buildGraphContextMenuEntries({
      selection: singleSelection,
      timelineActive: false,
      favorites: new Set<string>(),
      pluginItems: [],
    });
    expect(builtInActions(singleLive)).toEqual([
      'open',
      'reveal',
      'copyRelative',
      'copyAbsolute',
      'toggleFavorite',
      'focus',
      'addToExclude',
      'rename',
      'delete',
    ]);

    const singleTimeline = buildGraphContextMenuEntries({
      selection: singleSelection,
      timelineActive: true,
      favorites: new Set<string>(),
      pluginItems: [],
    });
    expect(builtInActions(singleTimeline)).toEqual([
      'open',
      'copyRelative',
      'copyAbsolute',
      'toggleFavorite',
      'focus',
    ]);

    const multiSelection = makeNodeContextSelection('src/a.ts', new Set(['src/a.ts', 'src/b.ts']));
    const multiLive = buildGraphContextMenuEntries({
      selection: multiSelection,
      timelineActive: false,
      favorites: new Set<string>(),
      pluginItems: [],
    });
    expect(builtInActions(multiLive)).toEqual([
      'open',
      'copyRelative',
      'toggleFavorite',
      'addToExclude',
      'delete',
    ]);

    const multiTimeline = buildGraphContextMenuEntries({
      selection: multiSelection,
      timelineActive: true,
      favorites: new Set<string>(),
      pluginItems: [],
    });
    expect(builtInActions(multiTimeline)).toEqual([
      'open',
      'copyRelative',
      'toggleFavorite',
    ]);
  });

  it('supports plugin items only for single-node context and maps action payloads', () => {
    const pluginItems: IPluginContextMenuItem[] = [
      { label: 'Run Rule', when: 'node', pluginId: 'acme', index: 0, group: 'A' },
      { label: 'Inspect', when: 'both', pluginId: 'acme', index: 1, group: 'B' },
      { label: 'Edge Only', when: 'edge', pluginId: 'acme', index: 2 },
    ];

    const singleNodeEntries = buildGraphContextMenuEntries({
      selection: makeNodeContextSelection('src/app.ts', new Set<string>()),
      timelineActive: false,
      favorites: new Set<string>(),
      pluginItems,
    });
    expect(menuLabels(singleNodeEntries)).toContain('Run Rule');
    expect(menuLabels(singleNodeEntries)).toContain('Inspect');
    expect(menuLabels(singleNodeEntries)).not.toContain('Edge Only');

    const pluginActionEntry = menuItems(singleNodeEntries).find(entry => entry.label === 'Run Rule');
    expect(pluginActionEntry?.kind).toBe('item');
    if (!pluginActionEntry || pluginActionEntry.kind !== 'item') {
      throw new Error('Expected plugin menu item');
    }
    expect(pluginActionEntry.action).toEqual({
      kind: 'plugin',
      pluginId: 'acme',
      index: 0,
      targetId: 'src/app.ts',
      targetType: 'node',
    });

    const multiNodeEntries = buildGraphContextMenuEntries({
      selection: makeNodeContextSelection('src/app.ts', new Set(['src/app.ts', 'src/utils.ts'])),
      timelineActive: false,
      favorites: new Set<string>(),
      pluginItems,
    });
    expect(menuLabels(multiNodeEntries)).not.toContain('Run Rule');
  });
});
