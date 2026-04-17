import { beforeEach, describe, expect, it } from 'vitest';
import type { IPluginContextMenuItem } from '../../../../src/shared/plugins/contextMenu';
import type { EdgeDecorationPayload, NodeDecorationPayload } from '../../../../src/shared/plugins/decorations';
import type { IGroup } from '../../../../src/shared/settings/groups';
import { createGraphStore } from '../../../../src/webview/store/state';
import { clearSentMessages, findMessage } from '../../../helpers/sentMessages';

describe('GraphStore message routing', () => {
  let store: ReturnType<typeof createGraphStore>;

  beforeEach(() => {
    store = createGraphStore();
    clearSentMessages();
  });

  it('handles PLAYBACK_SPEED_UPDATED messages', () => {
    store.getState().handleExtensionMessage({
      type: 'PLAYBACK_SPEED_UPDATED',
      payload: { speed: 1.75 },
    });

    expect(store.getState().playbackSpeed).toBe(1.75);
  });

  it('handles DECORATIONS_UPDATED messages', () => {
    const nodeDecorations: Record<string, NodeDecorationPayload> = {
      'src/app.ts': { color: '#00ff00' },
    };
    const edgeDecorations: Record<string, EdgeDecorationPayload> = {
      'src/app.ts->src/lib.ts': { width: 3, color: '#ff00ff' },
    };

    store.getState().handleExtensionMessage({
      type: 'DECORATIONS_UPDATED',
      payload: { nodeDecorations, edgeDecorations },
    });

    expect(store.getState().nodeDecorations).toEqual(nodeDecorations);
    expect(store.getState().edgeDecorations).toEqual(edgeDecorations);
  });

  it('ignores DECORATIONS_UPDATED messages when the payload is unchanged', () => {
    const nodeDecorations: Record<string, NodeDecorationPayload> = {
      'src/app.ts': {
        badge: { text: 'A', color: '#00ff00' },
      },
    };
    const edgeDecorations: Record<string, EdgeDecorationPayload> = {
      'src/app.ts->src/lib.ts': {
        particles: { count: 2, color: '#ff00ff', speed: 0.1 },
      },
    };

    store.setState({ nodeDecorations, edgeDecorations });

    store.getState().handleExtensionMessage({
      type: 'DECORATIONS_UPDATED',
      payload: {
        nodeDecorations: {
          'src/app.ts': {
            badge: { text: 'A', color: '#00ff00' },
          },
        },
        edgeDecorations: {
          'src/app.ts->src/lib.ts': {
            particles: { count: 2, color: '#ff00ff', speed: 0.1 },
          },
        },
      },
    });

    expect(store.getState().nodeDecorations).toBe(nodeDecorations);
    expect(store.getState().edgeDecorations).toBe(edgeDecorations);
  });

  it('ignores LEGENDS_UPDATED messages when the payload is unchanged', () => {
    const legends: IGroup[] = [
      {
        id: 'src-group',
        pattern: 'src/**',
        color: '#00ff00',
      },
    ];
    const optimisticLegendUpdates = {};

    store.setState({ legends, optimisticLegendUpdates });

    store.getState().handleExtensionMessage({
      type: 'LEGENDS_UPDATED',
      payload: {
        legends: [
          {
            id: 'src-group',
            pattern: 'src/**',
            color: '#00ff00',
          },
        ],
      },
    });

    expect(store.getState().legends).toBe(legends);
    expect(store.getState().optimisticLegendUpdates).toBe(optimisticLegendUpdates);
  });

  it('keeps optimistic custom groups visible when a stale LEGENDS_UPDATED payload arrives', () => {
    store.setState({
      legends: [
        { id: 'plugin:typescript:ts', pattern: '*.ts', color: '#3178C6', isPluginDefault: true },
      ],
    });
    store.getState().setOptimisticUserLegends([
      { id: 'g1', pattern: 'src/**', color: '#22C55E' },
    ]);

    store.getState().handleExtensionMessage({
      type: 'LEGENDS_UPDATED',
      payload: {
        legends: [
          { id: 'plugin:typescript:ts', pattern: '*.ts', color: '#3178C6', isPluginDefault: true },
        ],
      },
    });

    expect(store.getState().legends).toEqual([
      { id: 'g1', pattern: 'src/**', color: '#22C55E' },
      { id: 'plugin:typescript:ts', pattern: '*.ts', color: '#3178C6', isPluginDefault: true },
    ]);
    expect(store.getState().optimisticUserLegends?.groups).toEqual([
      { id: 'g1', pattern: 'src/**', color: '#22C55E' },
    ]);
  });

  it('clears optimistic custom groups once LEGENDS_UPDATED matches the host echo', () => {
    store.setState({
      legends: [
        { id: 'plugin:typescript:ts', pattern: '*.ts', color: '#3178C6', isPluginDefault: true },
      ],
    });
    store.getState().setOptimisticUserLegends([
      { id: 'g1', pattern: 'src/**', color: '#22C55E' },
    ]);

    store.getState().handleExtensionMessage({
      type: 'LEGENDS_UPDATED',
      payload: {
        legends: [
          { id: 'g1', pattern: 'src/**', color: '#22C55E' },
          { id: 'plugin:typescript:ts', pattern: '*.ts', color: '#3178C6', isPluginDefault: true },
        ],
      },
    });

    expect(store.getState().legends).toEqual([
      { id: 'g1', pattern: 'src/**', color: '#22C55E' },
      { id: 'plugin:typescript:ts', pattern: '*.ts', color: '#3178C6', isPluginDefault: true },
    ]);
    expect(store.getState().optimisticUserLegends).toBeNull();
  });

  it('handles CONTEXT_MENU_ITEMS messages', () => {
    const items: IPluginContextMenuItem[] = [
      {
        label: 'Open docs',
        when: 'node',
        pluginId: 'plugin.docs',
        index: 1,
      },
    ];

    store.getState().handleExtensionMessage({
      type: 'CONTEXT_MENU_ITEMS',
      payload: { items },
    });

    expect(store.getState().pluginContextMenuItems).toEqual(items);
  });

  it('handles PLUGIN_EXPORTERS_UPDATED messages', () => {
    const items = [
      {
        id: 'summary',
        label: 'Summary Export',
        pluginId: 'plugin.docs',
        pluginName: 'Docs Plugin',
        index: 0,
        group: 'Reports',
      },
    ];

    store.getState().handleExtensionMessage({
      type: 'PLUGIN_EXPORTERS_UPDATED',
      payload: { items },
    });

    expect(store.getState().pluginExporters).toEqual(items);
  });

  it('handles PLUGIN_TOOLBAR_ACTIONS_UPDATED messages', () => {
    const items = [
      {
        id: 'wikilinks',
        label: 'Docs',
        pluginId: 'plugin.docs',
        pluginName: 'Docs Plugin',
        index: 0,
        items: [
          {
            id: 'docs-summary',
            label: 'Docs Summary',
            index: 0,
          },
        ],
      },
    ];

    store.getState().handleExtensionMessage({
      type: 'PLUGIN_TOOLBAR_ACTIONS_UPDATED',
      payload: { items },
    });

    expect(store.getState().pluginToolbarActions).toEqual(items);
  });

  it('ignores PLUGIN_WEBVIEW_INJECT messages without mutating state', () => {
    store.setState({
      pluginContextMenuItems: [
        { label: 'Existing', when: 'both', pluginId: 'plugin.existing', index: 0 },
      ],
      pluginExporters: [
        {
          id: 'existing',
          label: 'Existing Export',
          pluginId: 'plugin.existing',
          pluginName: 'Existing Plugin',
          index: 0,
        },
      ],
      pluginToolbarActions: [
        {
          id: 'wikilinks',
          label: 'Docs',
          pluginId: 'plugin.existing',
          pluginName: 'Existing Plugin',
          index: 0,
          items: [
            { id: 'docs-summary', label: 'Docs Summary', index: 0 },
          ],
        },
      ],
      playbackSpeed: 2,
      dagMode: 'td',
      nodeSizeMode: 'uniform',
    });

    store.getState().handleExtensionMessage({
      type: 'PLUGIN_WEBVIEW_INJECT',
      payload: {
        pluginId: 'plugin.docs',
        scripts: ['webview://plugin.js'],
        styles: ['webview://plugin.css'],
      },
    });

    expect(store.getState().pluginContextMenuItems).toEqual([
      { label: 'Existing', when: 'both', pluginId: 'plugin.existing', index: 0 },
    ]);
    expect(store.getState().pluginExporters).toEqual([
      {
        id: 'existing',
        label: 'Existing Export',
        pluginId: 'plugin.existing',
        pluginName: 'Existing Plugin',
        index: 0,
      },
    ]);
    expect(store.getState().pluginToolbarActions).toEqual([
      {
        id: 'wikilinks',
        label: 'Docs',
        pluginId: 'plugin.existing',
        pluginName: 'Existing Plugin',
        index: 0,
        items: [
          { id: 'docs-summary', label: 'Docs Summary', index: 0 },
        ],
      },
    ]);
    expect(store.getState().playbackSpeed).toBe(2);
    expect(store.getState().dagMode).toBe('td');
    expect(store.getState().nodeSizeMode).toBe('uniform');
  });

  it('handles NODE_SIZE_MODE_UPDATED messages', () => {
    store.getState().handleExtensionMessage({
      type: 'NODE_SIZE_MODE_UPDATED',
      payload: { nodeSizeMode: 'access-count' },
    });

    expect(store.getState().nodeSizeMode).toBe('access-count');
  });

  it('CACHE_INVALIDATED clears indexing progress as well as timeline state', () => {
    store.setState({
      timelineActive: true,
      timelineCommits: [
        { sha: 'aaa', timestamp: 1, message: 'commit', author: 'a', parents: [] },
      ],
      currentCommitSha: 'aaa',
      isPlaying: true,
      isIndexing: true,
      indexProgress: { phase: 'indexing', current: 1, total: 10 },
    });

    store.getState().handleExtensionMessage({ type: 'CACHE_INVALIDATED' });

    expect(store.getState().timelineActive).toBe(false);
    expect(store.getState().timelineCommits).toEqual([]);
    expect(store.getState().currentCommitSha).toBeNull();
    expect(store.getState().isPlaying).toBe(false);
    expect(store.getState().isIndexing).toBe(false);
    expect(store.getState().indexProgress).toBeNull();
  });

  it('CYCLE_LAYOUT falls back to free-form when dagMode is outside the cycle', () => {
    store.setState({ dagMode: 'invalid-mode' as never });

    store.getState().handleExtensionMessage({ type: 'CYCLE_LAYOUT' });

    expect(findMessage('UPDATE_DAG_MODE')?.payload.dagMode).toBeNull();
  });
});
