import { describe, it, expect, beforeEach } from 'vitest';
import { createGraphStore } from '../../../../src/webview/store/state';
import { DEFAULT_DIRECTION_COLOR } from '../../../../src/shared/fileColors';
import { clearSentMessages, findMessage } from '../../../helpers/sentMessages';

describe('GraphStore', () => {
  let store: ReturnType<typeof createGraphStore>;

  beforeEach(() => {
    store = createGraphStore();
    clearSentMessages();
  });

  it('has correct initial state', () => {
    const state = store.getState();
    expect(state.graphData).toBeNull();
    expect(state.isLoading).toBe(true);
    expect(state.searchQuery).toBe('');
    expect(state.favorites).toEqual(new Set());
    expect(state.directionMode).toBe('arrows');
    expect(state.directionColor).toBe(DEFAULT_DIRECTION_COLOR);
    expect(state.particleSpeed).toBe(0.005);
    expect(state.particleSize).toBe(4);
    expect(state.showLabels).toBe(true);
    expect(state.graphMode).toBe('2d');
    expect(state.activePanel).toBe('none');
    expect(state.graphHasIndex).toBe(false);
  });

  it('handles GRAPH_DATA_UPDATED message', () => {
    const data = {
      nodes: [{ id: 'a.ts', label: 'a.ts', color: '#93C5FD' }],
      edges: [],
    };
    store.getState().handleExtensionMessage({
      type: 'GRAPH_DATA_UPDATED',
      payload: data,
    });
    expect(store.getState().graphData).toEqual(data);
    expect(store.getState().isLoading).toBe(false);
    expect(store.getState().isIndexing).toBe(false);
    expect(store.getState().indexProgress).toBeNull();
  });

  it('handles GRAPH_INDEX_STATUS_UPDATED message', () => {
    store.getState().handleExtensionMessage({
      type: 'GRAPH_INDEX_STATUS_UPDATED',
      payload: { hasIndex: true },
    });

    expect(store.getState().graphHasIndex).toBe(true);
  });

  it('handles FAVORITES_UPDATED message', () => {
    store.getState().handleExtensionMessage({
      type: 'FAVORITES_UPDATED',
      payload: { favorites: ['src/a.ts', 'src/b.ts'] },
    });
    expect(store.getState().favorites).toEqual(new Set(['src/a.ts', 'src/b.ts']));
  });

  it('handles SETTINGS_UPDATED message', () => {
    store.getState().handleExtensionMessage({
      type: 'SETTINGS_UPDATED',
      payload: { bidirectionalEdges: 'combined', showOrphans: false },
    });
    expect(store.getState().bidirectionalMode).toBe('combined');
    expect(store.getState().showOrphans).toBe(false);
  });

  it('handles DIRECTION_SETTINGS_UPDATED message', () => {
    store.getState().handleExtensionMessage({
      type: 'DIRECTION_SETTINGS_UPDATED',
      payload: { directionMode: 'particles', directionColor: '#00FF00', particleSpeed: 0.01, particleSize: 6 },
    });
    expect(store.getState().directionMode).toBe('particles');
    expect(store.getState().directionColor).toBe('#00FF00');
    expect(store.getState().particleSpeed).toBe(0.01);
    expect(store.getState().particleSize).toBe(6);
  });

  it('handles SHOW_LABELS_UPDATED message', () => {
    store.getState().handleExtensionMessage({
      type: 'SHOW_LABELS_UPDATED',
      payload: { showLabels: false },
    });
    expect(store.getState().showLabels).toBe(false);
  });

  it('handles LEGENDS_UPDATED message', () => {
    const legends = [{ id: 'g1', pattern: 'src/**', color: '#ff0000' }];
    store.getState().handleExtensionMessage({
      type: 'LEGENDS_UPDATED',
      payload: { legends },
    });
    expect(store.getState().legends).toEqual(legends);
  });

  it('handles FILTER_PATTERNS_UPDATED message', () => {
    store.getState().handleExtensionMessage({
      type: 'FILTER_PATTERNS_UPDATED',
      payload: {
        patterns: ['*.test.ts'],
        pluginPatterns: ['*.uid'],
        pluginPatternGroups: [],
        disabledCustomPatterns: ['custom/**'],
        disabledPluginPatterns: [],
      },
    });
    expect(store.getState().filterPatterns).toEqual(['*.test.ts']);
    expect(store.getState().pluginFilterPatterns).toEqual(['*.uid']);
    expect(store.getState().disabledCustomFilterPatterns).toEqual(['custom/**']);
    expect(store.getState().disabledPluginFilterPatterns).toEqual([]);
  });

  it('handles DEPTH_MODE_UPDATED message', () => {
    store.getState().handleExtensionMessage({
      type: 'DEPTH_MODE_UPDATED',
      payload: { depthMode: true },
    });
    expect(store.getState().depthMode).toBe(true);
  });

  it('handles PHYSICS_SETTINGS_UPDATED message', () => {
    const physics = { repelForce: 15, linkDistance: 100, linkForce: 0.2, damping: 0.5, centerForce: 0.3 };
    store.getState().handleExtensionMessage({
      type: 'PHYSICS_SETTINGS_UPDATED',
      payload: physics,
    });
    expect(store.getState().physicsSettings).toEqual(physics);
  });

  it('handles DEPTH_LIMIT_UPDATED message', () => {
    store.getState().handleExtensionMessage({
      type: 'DEPTH_LIMIT_UPDATED',
      payload: { depthLimit: 4 },
    });
    expect(store.getState().depthLimit).toBe(4);
  });

  it('handles DEPTH_LIMIT_RANGE_UPDATED message', () => {
    store.getState().handleExtensionMessage({
      type: 'DEPTH_LIMIT_RANGE_UPDATED',
      payload: { maxDepthLimit: 2 },
    });
    expect(store.getState().maxDepthLimit).toBe(2);
  });

  it('handles PLUGINS_UPDATED message', () => {
    const plugins = [{
      id: 'ts',
      name: 'TypeScript',
      version: '1.0',
      supportedExtensions: ['.ts'],
      status: 'active' as const,
      enabled: true,
      connectionCount: 5,
    }];
    store.getState().handleExtensionMessage({
      type: 'PLUGINS_UPDATED',
      payload: { plugins },
    });
    expect(store.getState().pluginStatuses).toEqual(plugins);
  });

  it('handles PLUGIN_EXPORTERS_UPDATED message', () => {
    const items = [{
      id: 'summary',
      label: 'Summary Export',
      pluginId: 'plugin.docs',
      pluginName: 'Docs Plugin',
      index: 0,
      group: 'Reports',
    }];
    store.getState().handleExtensionMessage({
      type: 'PLUGIN_EXPORTERS_UPDATED',
      payload: { items },
    });
    expect(store.getState().pluginExporters).toEqual(items);
  });

  it('handles PLUGIN_TOOLBAR_ACTIONS_UPDATED message', () => {
    const items = [{
      id: 'wikilinks',
      label: 'Docs',
      pluginId: 'plugin.docs',
      pluginName: 'Docs Plugin',
      index: 0,
      items: [{
        id: 'docs-summary',
        label: 'Docs Summary',
        index: 0,
      }],
    }];
    store.getState().handleExtensionMessage({
      type: 'PLUGIN_TOOLBAR_ACTIONS_UPDATED',
      payload: { items },
    });
    expect(store.getState().pluginToolbarActions).toEqual(items);
  });

  it('handles MAX_FILES_UPDATED message', () => {
    store.getState().handleExtensionMessage({
      type: 'MAX_FILES_UPDATED',
      payload: { maxFiles: 1000 },
    });
    expect(store.getState().maxFiles).toBe(1000);
  });

  it('handles ACTIVE_FILE_UPDATED message', () => {
    store.getState().handleExtensionMessage({
      type: 'ACTIVE_FILE_UPDATED',
      payload: { filePath: 'src/game/player.gd' },
    });
    expect(store.getState().activeFilePath).toBe('src/game/player.gd');
  });

  it('setSearchQuery updates search query', () => {
    store.getState().setSearchQuery('test');
    expect(store.getState().searchQuery).toBe('test');
  });

  it('setActivePanel updates active panel', () => {
    store.getState().setActivePanel('settings');
    expect(store.getState().activePanel).toBe('settings');
  });

  it('has correct initial dagMode state', () => {
    const state = store.getState();
    expect(state.dagMode).toBeNull();
  });

  it('handles DAG_MODE_UPDATED message', () => {
    store.getState().handleExtensionMessage({
      type: 'DAG_MODE_UPDATED',
      payload: { dagMode: 'td' },
    });
    expect(store.getState().dagMode).toBe('td');
  });

  it('setDagMode updates dagMode', () => {
    store.getState().setDagMode('lr');
    expect(store.getState().dagMode).toBe('lr');
  });

  it('handles TOGGLE_DIMENSION message', () => {
    expect(store.getState().graphMode).toBe('2d');
    store.getState().handleExtensionMessage({ type: 'TOGGLE_DIMENSION' });
    expect(store.getState().graphMode).toBe('3d');
    store.getState().handleExtensionMessage({ type: 'TOGGLE_DIMENSION' });
    expect(store.getState().graphMode).toBe('2d');
  });

  it('TOGGLE_DEPTH_MODE enables depth mode when an index exists', () => {
    store.getState().handleExtensionMessage({
      type: 'GRAPH_INDEX_STATUS_UPDATED',
      payload: { hasIndex: true },
    });
    store.getState().handleExtensionMessage({ type: 'TOGGLE_DEPTH_MODE' });
    const msg = findMessage('UPDATE_DEPTH_MODE');
    expect(msg).toBeTruthy();
    expect(msg!.payload.depthMode).toBe(true);
  });

  it('TOGGLE_DEPTH_MODE returns to the main graph when depth mode is already active', () => {
    store.getState().handleExtensionMessage({
      type: 'GRAPH_INDEX_STATUS_UPDATED',
      payload: { hasIndex: true },
    });
    store.getState().handleExtensionMessage({
      type: 'DEPTH_MODE_UPDATED',
      payload: { depthMode: true },
    });
    store.getState().handleExtensionMessage({ type: 'TOGGLE_DEPTH_MODE' });
    const msg = findMessage('UPDATE_DEPTH_MODE');
    expect(msg).toBeTruthy();
    expect(msg!.payload.depthMode).toBe(false);
  });

  it('TOGGLE_DEPTH_MODE is a no-op before the repo has been indexed', () => {
    store.getState().handleExtensionMessage({ type: 'TOGGLE_DEPTH_MODE' });
    expect(findMessage('UPDATE_DEPTH_MODE')).toBeUndefined();
  });

  it('CYCLE_LAYOUT cycles through all DAG modes in order', () => {
    // null → radialout
    store.getState().handleExtensionMessage({ type: 'CYCLE_LAYOUT' });
    let msg = findMessage('UPDATE_DAG_MODE');
    expect(msg!.payload.dagMode).toBe('radialout');

    // Simulate the echo: extension sets dagMode to radialout
    store.getState().handleExtensionMessage({
      type: 'DAG_MODE_UPDATED',
      payload: { dagMode: 'radialout' },
    });

    // radialout → td
    clearSentMessages();
    store.getState().handleExtensionMessage({ type: 'CYCLE_LAYOUT' });
    msg = findMessage('UPDATE_DAG_MODE');
    expect(msg!.payload.dagMode).toBe('td');

    store.getState().handleExtensionMessage({
      type: 'DAG_MODE_UPDATED',
      payload: { dagMode: 'td' },
    });

    // td → lr
    clearSentMessages();
    store.getState().handleExtensionMessage({ type: 'CYCLE_LAYOUT' });
    msg = findMessage('UPDATE_DAG_MODE');
    expect(msg!.payload.dagMode).toBe('lr');

    store.getState().handleExtensionMessage({
      type: 'DAG_MODE_UPDATED',
      payload: { dagMode: 'lr' },
    });

    // lr → null (wraps around)
    clearSentMessages();
    store.getState().handleExtensionMessage({ type: 'CYCLE_LAYOUT' });
    msg = findMessage('UPDATE_DAG_MODE');
    expect(msg!.payload.dagMode).toBeNull();
  });
});
