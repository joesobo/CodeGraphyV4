import { describe, expect, it } from 'vitest';
import { buildGraphContextMenuEntries } from '../../../../src/webview/components/graph/contextMenu/build/entries';
import {
  makeBackgroundContextSelection,
  makeEdgeContextSelection,
  makeNodeContextSelection,
} from '../../../../src/webview/components/graph/contextMenu/selection';
import { builtInActions, menuItems, menuLabels } from './modelFixture';

describe('built-in graph context menus', () => {
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

});
