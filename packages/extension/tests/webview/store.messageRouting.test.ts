import { beforeEach, describe, expect, it } from 'vitest';
import type {
  EdgeDecorationPayload,
  IPluginContextMenuItem,
  NodeDecorationPayload,
} from '../../src/shared/types';
import { createGraphStore } from '../../src/webview/store';
import { clearSentMessages, findMessage } from '../helpers/sentMessages';

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

  it('ignores PLUGIN_WEBVIEW_INJECT messages without mutating state', () => {
    store.setState({
      pluginContextMenuItems: [
        { label: 'Existing', when: 'both', pluginId: 'plugin.existing', index: 0 },
      ],
      playbackSpeed: 2,
      dagMode: 'td',
      folderNodeColor: '#112233',
      nodeSizeMode: 'uniform',
    });

    store.getState().handleExtensionMessage({
      type: 'PLUGIN_WEBVIEW_INJECT',
      payload: {
        injections: [
          {
            pluginId: 'plugin.docs',
            scripts: ['webview://plugin.js'],
            styles: ['webview://plugin.css'],
          },
        ],
      },
    });

    expect(store.getState().pluginContextMenuItems).toEqual([
      { label: 'Existing', when: 'both', pluginId: 'plugin.existing', index: 0 },
    ]);
    expect(store.getState().playbackSpeed).toBe(2);
    expect(store.getState().dagMode).toBe('td');
    expect(store.getState().folderNodeColor).toBe('#112233');
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

  it('CYCLE_VIEW falls back to the first view when the active view is missing', () => {
    store.setState({
      availableViews: [
        {
          id: 'codegraphy.connections',
          name: 'Connections',
          icon: 'graph',
          description: '',
          active: false,
        },
        {
          id: 'codegraphy.depth-graph',
          name: 'Depth Graph',
          icon: 'target',
          description: '',
          active: false,
        },
      ],
      activeViewId: 'codegraphy.unknown',
    });

    store.getState().handleExtensionMessage({ type: 'CYCLE_VIEW' });

    expect(findMessage('CHANGE_VIEW')?.payload.viewId).toBe('codegraphy.connections');
  });

  it('CYCLE_LAYOUT falls back to free-form when dagMode is outside the cycle', () => {
    store.setState({ dagMode: 'invalid-mode' as never });

    store.getState().handleExtensionMessage({ type: 'CYCLE_LAYOUT' });

    expect(findMessage('UPDATE_DAG_MODE')?.payload.dagMode).toBeNull();
  });
});
