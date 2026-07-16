import { describe, expect, it } from 'vitest';
import type { IPluginContextMenuItem } from '../../../../src/shared/plugins/contextMenu';
import { buildGraphContextMenuEntries } from '../../../../src/webview/components/graph/contextMenu/build/entries';
import {
  makeBackgroundContextSelection,
  makeEdgeContextSelection,
  makeNodeContextSelection,
} from '../../../../src/webview/components/graph/contextMenu/selection';
import { builtInActions, menuItems, menuLabels } from './modelFixture';

describe('plugin graph context menus', () => {
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
