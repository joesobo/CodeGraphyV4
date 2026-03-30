import { describe, it, expect } from 'vitest';
import type { IPluginContextMenuItem } from '../../../../src/shared/plugins/contextMenu';
import { buildGraphContextMenuEntries } from '../../../../src/webview/components/graph/contextMenu/buildEntries';
import {
  makeBackgroundContextSelection,
  makeEdgeContextSelection,
  makeNodeContextSelection,
} from '../../../../src/webview/components/graph/contextMenu/selection';
import type {
  BuiltInContextMenuAction,
  GraphContextMenuEntry,
} from '../../../../src/webview/components/graph/contextMenu/contracts';

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

describe('graph/contextMenuModel', () => {
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
      'addToFilter',
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
      'addToFilter',
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

    const edgeSelection = makeEdgeContextSelection('src/a.ts->src/b.ts', 'src/a.ts', 'src/b.ts');
    const edgeLive = buildGraphContextMenuEntries({
      selection: edgeSelection,
      timelineActive: false,
      favorites: new Set<string>(),
      pluginItems: [],
    });
    expect(menuLabels(edgeLive)).toEqual([
      'Copy Source Path',
      'Copy Target Path',
      'Copy Both Paths',
    ]);
    expect(builtInActions(edgeLive)).toEqual([
      'copyEdgeSource',
      'copyEdgeTarget',
      'copyEdgeBoth',
    ]);

    const edgeTimeline = buildGraphContextMenuEntries({
      selection: edgeSelection,
      timelineActive: true,
      favorites: new Set<string>(),
      pluginItems: [],
    });
    expect(builtInActions(edgeTimeline)).toEqual([
      'copyEdgeSource',
      'copyEdgeTarget',
      'copyEdgeBoth',
    ]);
  });

  it('supports plugin items for node/edge contexts and maps action payloads', () => {
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

    const edgeEntries = buildGraphContextMenuEntries({
      selection: makeEdgeContextSelection('src/app.ts->src/utils.ts', 'src/app.ts', 'src/utils.ts'),
      timelineActive: false,
      favorites: new Set<string>(),
      pluginItems,
    });
    expect(menuLabels(edgeEntries)).toContain('Inspect');
    expect(menuLabels(edgeEntries)).toContain('Edge Only');
    expect(menuLabels(edgeEntries)).not.toContain('Run Rule');

    const edgeActionEntry = menuItems(edgeEntries).find(entry => entry.label === 'Edge Only');
    expect(edgeActionEntry?.kind).toBe('item');
    if (!edgeActionEntry || edgeActionEntry.kind !== 'item') {
      throw new Error('Expected edge plugin menu item');
    }
    expect(edgeActionEntry.action).toEqual({
      kind: 'plugin',
      pluginId: 'acme',
      index: 2,
      targetId: 'src/app.ts->src/utils.ts',
      targetType: 'edge',
    });
  });
});
