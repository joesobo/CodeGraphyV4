import { describe, it, expect, vi, beforeEach } from 'vitest';
import { messageHandlers, DAG_MODE_CYCLE } from '../../src/webview/storeMessageHandlers';
import { clearSentMessages, findMessage } from '../helpers/sentMessages';

function makeSetGet(initialState: Record<string, unknown> = {}) {
  const state: Record<string, unknown> = { ...initialState };
  const set = vi.fn((partial: Record<string, unknown>) => Object.assign(state, partial));
  const get = vi.fn(() => state);
  return { state, set, get };
}

describe('messageHandlers', () => {
  beforeEach(() => {
    clearSentMessages();
  });

  describe('GRAPH_DATA_UPDATED', () => {
    it('sets graphData and clears loading flag', () => {
      const { state, set, get } = makeSetGet({ isLoading: true });
      const data = { nodes: [{ id: 'a.ts', label: 'a.ts', color: '#fff' }], edges: [] };
      messageHandlers.GRAPH_DATA_UPDATED(set, get, data);
      expect(state.graphData).toEqual(data);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('FAVORITES_UPDATED', () => {
    it('converts the favorites array to a Set', () => {
      const { state, set, get } = makeSetGet();
      messageHandlers.FAVORITES_UPDATED(set, get, { favorites: ['src/a.ts', 'src/b.ts'] });
      expect(state.favorites).toEqual(new Set(['src/a.ts', 'src/b.ts']));
    });
  });

  describe('SETTINGS_UPDATED', () => {
    it('updates bidirectionalMode and showOrphans', () => {
      const { state, set, get } = makeSetGet();
      messageHandlers.SETTINGS_UPDATED(set, get, { bidirectionalEdges: 'combined', showOrphans: false });
      expect(state.bidirectionalMode).toBe('combined');
      expect(state.showOrphans).toBe(false);
    });
  });

  describe('GROUPS_UPDATED', () => {
    it('updates groups list', () => {
      const { state, set, get } = makeSetGet();
      const groups = [{ id: 'g1', pattern: 'src/**', color: '#ff0000' }];
      messageHandlers.GROUPS_UPDATED(set, get, { groups });
      expect(state.groups).toEqual(groups);
    });
  });

  describe('FILTER_PATTERNS_UPDATED', () => {
    it('updates filterPatterns and pluginFilterPatterns', () => {
      const { state, set, get } = makeSetGet();
      messageHandlers.FILTER_PATTERNS_UPDATED(set, get, { patterns: ['*.test.ts'], pluginPatterns: ['*.uid'] });
      expect(state.filterPatterns).toEqual(['*.test.ts']);
      expect(state.pluginFilterPatterns).toEqual(['*.uid']);
    });
  });

  describe('VIEWS_UPDATED', () => {
    it('updates availableViews and activeViewId', () => {
      const { state, set, get } = makeSetGet();
      const views = [{ id: 'v1', name: 'Connections', icon: 'graph', description: '', active: true }];
      messageHandlers.VIEWS_UPDATED(set, get, { views, activeViewId: 'v1' });
      expect(state.availableViews).toEqual(views);
      expect(state.activeViewId).toBe('v1');
    });
  });

  describe('PHYSICS_SETTINGS_UPDATED', () => {
    it('replaces physics settings', () => {
      const { state, set, get } = makeSetGet();
      const physics = { repelForce: 15, linkDistance: 100, linkForce: 0.2, damping: 0.5, centerForce: 0.3 };
      messageHandlers.PHYSICS_SETTINGS_UPDATED(set, get, physics);
      expect(state.physicsSettings).toEqual(physics);
    });
  });

  describe('DEPTH_LIMIT_UPDATED', () => {
    it('updates depthLimit', () => {
      const { state, set, get } = makeSetGet();
      messageHandlers.DEPTH_LIMIT_UPDATED(set, get, { depthLimit: 4 });
      expect(state.depthLimit).toBe(4);
    });
  });

  describe('DIRECTION_SETTINGS_UPDATED', () => {
    it('updates all direction-related fields', () => {
      const { state, set, get } = makeSetGet();
      messageHandlers.DIRECTION_SETTINGS_UPDATED(set, get, {
        directionMode: 'particles',
        directionColor: '#00FF00',
        particleSpeed: 0.01,
        particleSize: 6,
      });
      expect(state.directionMode).toBe('particles');
      expect(state.directionColor).toBe('#00FF00');
      expect(state.particleSpeed).toBe(0.01);
      expect(state.particleSize).toBe(6);
    });
  });

  describe('SHOW_LABELS_UPDATED', () => {
    it('updates showLabels', () => {
      const { state, set, get } = makeSetGet({ showLabels: true });
      messageHandlers.SHOW_LABELS_UPDATED(set, get, { showLabels: false });
      expect(state.showLabels).toBe(false);
    });
  });

  describe('PLUGINS_UPDATED', () => {
    it('updates pluginStatuses', () => {
      const { state, set, get } = makeSetGet();
      const plugins = [{ id: 'ts', name: 'TypeScript', version: '1.0', supportedExtensions: ['.ts'], status: 'active', enabled: true, connectionCount: 5, rules: [] }];
      messageHandlers.PLUGINS_UPDATED(set, get, { plugins });
      expect(state.pluginStatuses).toEqual(plugins);
    });
  });

  describe('MAX_FILES_UPDATED', () => {
    it('updates maxFiles', () => {
      const { state, set, get } = makeSetGet();
      messageHandlers.MAX_FILES_UPDATED(set, get, { maxFiles: 1000 });
      expect(state.maxFiles).toBe(1000);
    });
  });

  describe('INDEX_PROGRESS', () => {
    it('sets isIndexing and stores progress', () => {
      const { state, set, get } = makeSetGet({ isIndexing: false });
      const progress = { phase: 'analyzing', current: 5, total: 20 };
      messageHandlers.INDEX_PROGRESS(set, get, progress);
      expect(state.isIndexing).toBe(true);
      expect(state.indexProgress).toEqual(progress);
    });
  });

  describe('TIMELINE_DATA', () => {
    it('activates timeline and stores commits', () => {
      const { state, set, get } = makeSetGet({ isIndexing: true });
      const commits = [{ sha: 'abc123', message: 'feat: something', date: '2024-01-01' }];
      messageHandlers.TIMELINE_DATA(set, get, { commits, currentSha: 'abc123' });
      expect(state.isIndexing).toBe(false);
      expect(state.indexProgress).toBeNull();
      expect(state.timelineActive).toBe(true);
      expect(state.timelineCommits).toEqual(commits);
      expect(state.currentCommitSha).toBe('abc123');
    });
  });

  describe('COMMIT_GRAPH_DATA', () => {
    it('updates sha and graphData', () => {
      const { state, set, get } = makeSetGet();
      const graphData = { nodes: [], edges: [] };
      messageHandlers.COMMIT_GRAPH_DATA(set, get, { sha: 'def456', graphData });
      expect(state.currentCommitSha).toBe('def456');
      expect(state.graphData).toEqual(graphData);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('PLAYBACK_SPEED_UPDATED', () => {
    it('updates playbackSpeed', () => {
      const { state, set, get } = makeSetGet();
      messageHandlers.PLAYBACK_SPEED_UPDATED(set, get, { speed: 2.0 });
      expect(state.playbackSpeed).toBe(2.0);
    });
  });

  describe('CACHE_INVALIDATED', () => {
    it('resets all timeline-related fields', () => {
      const { state, set, get } = makeSetGet({
        timelineActive: true,
        timelineCommits: [{ sha: 'x' }],
        currentCommitSha: 'x',
        isPlaying: true,
        isIndexing: true,
        indexProgress: { phase: 'p', current: 1, total: 10 },
      });
      messageHandlers.CACHE_INVALIDATED(set, get, undefined);
      expect(state.timelineActive).toBe(false);
      expect(state.timelineCommits).toEqual([]);
      expect(state.currentCommitSha).toBeNull();
      expect(state.isPlaying).toBe(false);
      expect(state.isIndexing).toBe(false);
      expect(state.indexProgress).toBeNull();
    });
  });

  describe('PLAYBACK_ENDED', () => {
    it('sets isPlaying to false', () => {
      const { state, set, get } = makeSetGet({ isPlaying: true });
      messageHandlers.PLAYBACK_ENDED(set, get, undefined);
      expect(state.isPlaying).toBe(false);
    });
  });

  describe('DECORATIONS_UPDATED', () => {
    it('updates nodeDecorations and edgeDecorations', () => {
      const { state, set, get } = makeSetGet();
      const nodeDecorations = { 'a.ts': { badge: { text: '1', bgColor: '#f00', color: '#fff' } } };
      const edgeDecorations = {};
      messageHandlers.DECORATIONS_UPDATED(set, get, { nodeDecorations, edgeDecorations });
      expect(state.nodeDecorations).toEqual(nodeDecorations);
      expect(state.edgeDecorations).toEqual(edgeDecorations);
    });
  });

  describe('CONTEXT_MENU_ITEMS', () => {
    it('updates pluginContextMenuItems', () => {
      const { state, set, get } = makeSetGet();
      const items = [{ id: 'item1', label: 'Open', pluginId: 'ts' }];
      messageHandlers.CONTEXT_MENU_ITEMS(set, get, { items });
      expect(state.pluginContextMenuItems).toEqual(items);
    });
  });

  describe('PLUGIN_WEBVIEW_INJECT', () => {
    it('is a no-op (Tier 2 — not yet implemented)', () => {
      const { set, get } = makeSetGet();
      expect(() => messageHandlers.PLUGIN_WEBVIEW_INJECT(set, get, {})).not.toThrow();
      expect(set).not.toHaveBeenCalled();
    });
  });

  describe('DAG_MODE_UPDATED', () => {
    it('updates dagMode', () => {
      const { state, set, get } = makeSetGet({ dagMode: null });
      messageHandlers.DAG_MODE_UPDATED(set, get, { dagMode: 'td' });
      expect(state.dagMode).toBe('td');
    });
  });

  describe('FOLDER_NODE_COLOR_UPDATED', () => {
    it('updates folderNodeColor', () => {
      const { state, set, get } = makeSetGet();
      messageHandlers.FOLDER_NODE_COLOR_UPDATED(set, get, { folderNodeColor: '#FF0000' });
      expect(state.folderNodeColor).toBe('#FF0000');
    });
  });

  describe('NODE_SIZE_MODE_UPDATED', () => {
    it('updates nodeSizeMode', () => {
      const { state, set, get } = makeSetGet();
      messageHandlers.NODE_SIZE_MODE_UPDATED(set, get, { nodeSizeMode: 'uniform' });
      expect(state.nodeSizeMode).toBe('uniform');
    });
  });

  describe('CYCLE_VIEW', () => {
    it('sends CHANGE_VIEW with next available view', () => {
      const { set, get } = makeSetGet({
        availableViews: [
          { id: 'view-a', name: 'A', icon: 'graph', description: '', active: true },
          { id: 'view-b', name: 'B', icon: 'graph', description: '', active: false },
        ],
        activeViewId: 'view-a',
      });
      messageHandlers.CYCLE_VIEW(set, get, undefined);
      const msg = findMessage('CHANGE_VIEW');
      expect(msg).toBeTruthy();
      expect(msg!.payload.viewId).toBe('view-b');
    });

    it('wraps around to first view from last', () => {
      const { set, get } = makeSetGet({
        availableViews: [
          { id: 'view-a', name: 'A', icon: 'graph', description: '', active: false },
          { id: 'view-b', name: 'B', icon: 'graph', description: '', active: true },
        ],
        activeViewId: 'view-b',
      });
      messageHandlers.CYCLE_VIEW(set, get, undefined);
      const msg = findMessage('CHANGE_VIEW');
      expect(msg!.payload.viewId).toBe('view-a');
    });

    it('is a no-op when no views are available', () => {
      const { set, get } = makeSetGet({ availableViews: [], activeViewId: '' });
      messageHandlers.CYCLE_VIEW(set, get, undefined);
      expect(findMessage('CHANGE_VIEW')).toBeUndefined();
    });
  });

  describe('CYCLE_LAYOUT', () => {
    it('cycles through DAG_MODE_CYCLE in order', () => {
      const { set, get } = makeSetGet({ dagMode: null });
      messageHandlers.CYCLE_LAYOUT(set, get, undefined);
      const msg = findMessage('UPDATE_DAG_MODE');
      expect(msg!.payload.dagMode).toBe('radialout');
    });

    it('DAG_MODE_CYCLE contains all expected modes', () => {
      expect(DAG_MODE_CYCLE).toEqual([null, 'radialout', 'td', 'lr']);
    });
  });

  describe('TOGGLE_DIMENSION', () => {
    it('toggles from 2d to 3d', () => {
      const { state, set, get } = makeSetGet({ graphMode: '2d' });
      messageHandlers.TOGGLE_DIMENSION(set, get, undefined);
      expect(state.graphMode).toBe('3d');
    });

    it('toggles from 3d to 2d', () => {
      const { state, set, get } = makeSetGet({ graphMode: '3d' });
      messageHandlers.TOGGLE_DIMENSION(set, get, undefined);
      expect(state.graphMode).toBe('2d');
    });
  });
});
