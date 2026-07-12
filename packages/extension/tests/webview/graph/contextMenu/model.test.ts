import { describe, it, expect } from 'vitest';
import type { IPluginContextMenuItem } from '../../../../src/shared/plugins/contextMenu';
import { buildGraphContextMenuEntries } from '../../../../src/webview/components/graph/contextMenu/build/entries';
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
  it('builds background creation actions with captured selection context', () => {
    const selection = makeBackgroundContextSelection();
    const liveEntries = buildGraphContextMenuEntries({
      selection,
      favorites: new Set(),
      pluginItems: [],
    });
    expect(menuLabels(liveEntries)).toEqual(['New File', 'New Folder', 'Refresh', 'Fit All Nodes']);
    selection.targets.push('src/late.ts');
    expect(menuItems(liveEntries).map(entry => entry.contextSelection)).toEqual([
      { kind: 'background', targets: [] },
      { kind: 'background', targets: [] },
      { kind: 'background', targets: [] },
      { kind: 'background', targets: [] },
    ]);

  });

  it('builds file-node actions', () => {
    const selection = makeNodeContextSelection('src/app.ts', new Set<string>());
    const liveEntries = buildGraphContextMenuEntries({
      selection,
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
      'Add Filter Pattern',
      'Add Legend Group',
      'Rename',
      'Delete File',
    ]);

  });

  it('builds single-folder-node menu with child creation actions', () => {
    const entries = buildGraphContextMenuEntries({
      selection: makeNodeContextSelection('src', new Set<string>()),
      favorites: new Set<string>(),
      pluginItems: [],
      nodes: [{ id: 'src', label: 'src', color: '#94a3b8', nodeType: 'folder' }],
    });

    expect(menuLabels(entries)).toEqual([
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
    ]);
  });


  it('does not show rename or delete actions for the synthetic root folder node', () => {
    const entries = buildGraphContextMenuEntries({
      selection: makeNodeContextSelection('(root)', new Set<string>()),
      favorites: new Set<string>(),
      pluginItems: [],
      nodes: [{ id: '(root)', label: '(root)', color: '#94a3b8', nodeType: 'folder' }],
    });

    expect(menuLabels(entries)).not.toContain('Rename Folder');
    expect(menuLabels(entries)).not.toContain('Delete Folder');
  });

  it('builds multi-node menu with only valid actions', () => {
    const selection = makeNodeContextSelection('src/a.ts', new Set(['src/a.ts', 'src/b.ts']));
    const entries = buildGraphContextMenuEntries({
      selection,
      favorites: new Set(['src/a.ts']),
      pluginItems: [],
    });
    expect(menuLabels(entries)).toEqual([
      'Open 2 Files',
      'Copy Relative Paths',
      'Add All to Favorites',
      'Add Filter Patterns',
      'Delete 2 Files',
    ]);
  });

  it('does not offer file actions for plugin-owned runtime nodes', () => {
    const entries = buildGraphContextMenuEntries({
      selection: makeNodeContextSelection('plugin-node', new Set<string>()),
      favorites: new Set<string>(),
      pluginItems: [],
      graphViewContributions: {
        runtimeNodes: [],
        runtimeEdges: [],
        projections: [],
        forces: [],
        nodeDragEnd: [],
        contextMenu: [{
          pluginId: 'plugin.example',
          contribution: {
            id: 'plugin-widget-action',
            label: 'Plugin Widget Action',
            targets: [{ kind: 'runtimeNodeType', runtimeNodeTypes: ['example-widget'] }],
            run: () => {},
          },
        }],
        ui: [],
      },
      nodes: [{
        id: 'plugin-node',
        label: 'Plugin Node',
        nodeType: 'example-widget',
        ownerPluginId: 'plugin.example',
        runtimeNodeType: 'example-widget',
      }],
    });

    expect(menuLabels(entries)).toEqual([
      'Focus Node',
      'Plugin Widget Action',
    ]);
    expect(menuLabels(entries)).not.toContain('Delete File');
    expect(entries.some(entry => entry.kind === 'item' && entry.action.kind === 'graphViewPlugin')).toBe(true);
  });

  it('keeps plugin-authored node actions out of the public built-in action set', () => {
    const backgroundEntries = buildGraphContextMenuEntries({
      selection: makeBackgroundContextSelection(),
      favorites: new Set(),
      pluginItems: [],
    });
    expect(builtInActions(backgroundEntries)).toEqual(['createFile', 'createFolder', 'refresh', 'fitView']);

    const singleSelectionEntries = buildGraphContextMenuEntries({
      selection: makeNodeContextSelection('src/app.ts', new Set<string>()),
      favorites: new Set(),
      pluginItems: [],
    });
    expect(builtInActions(singleSelectionEntries)).toEqual([
      'open',
      'reveal',
      'copyRelative',
      'copyAbsolute',
      'toggleFavorite',
      'focus',
      'addToFilter',
      'addNodeLegend',
      'rename',
      'delete',
    ]);

    const selectionEntries = buildGraphContextMenuEntries({
      selection: makeNodeContextSelection('src/a.ts', new Set(['src/a.ts', 'src/b.ts'])),
      favorites: new Set(),
      pluginItems: [],
    });
    expect(builtInActions(selectionEntries)).toEqual([
      'open',
      'copyRelative',
      'toggleFavorite',
      'addToFilter',
      'delete',
    ]);
  });

  it('maps all built-in actions by context variant', () => {
    const backgroundLive = buildGraphContextMenuEntries({
      selection: makeBackgroundContextSelection(),
      favorites: new Set(),
      pluginItems: [],
    });
    expect(builtInActions(backgroundLive)).toEqual(['createFile', 'createFolder', 'refresh', 'fitView']);


    const singleSelection = makeNodeContextSelection('src/app.ts', new Set<string>());
    const singleLive = buildGraphContextMenuEntries({
      selection: singleSelection,
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
      'addNodeLegend',
      'rename',
      'delete',
    ]);


    const multiSelection = makeNodeContextSelection('src/a.ts', new Set(['src/a.ts', 'src/b.ts']));
    const multiLive = buildGraphContextMenuEntries({
      selection: multiSelection,
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


    const edgeSelection = makeEdgeContextSelection('src/a.ts->src/b.ts', 'src/a.ts', 'src/b.ts');
    const edgeLive = buildGraphContextMenuEntries({
      selection: edgeSelection,
      favorites: new Set<string>(),
      pluginItems: [],
    });
    expect(menuLabels(edgeLive)).toEqual([
      'Open Source',
      'Open Target',
      'Copy Source Path',
      'Copy Target Path',
      'Copy Both Paths',
    ]);
    expect(builtInActions(edgeLive)).toEqual([
      'openEdgeSource',
      'openEdgeTarget',
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
      favorites: new Set<string>(),
      pluginItems,
    });
    expect(menuLabels(multiNodeEntries)).not.toContain('Run Rule');

    const edgeEntries = buildGraphContextMenuEntries({
      selection: makeEdgeContextSelection('src/app.ts->src/utils.ts', 'src/app.ts', 'src/utils.ts'),
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
