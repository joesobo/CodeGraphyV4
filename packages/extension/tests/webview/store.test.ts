import { describe, it, expect, beforeEach } from 'vitest';
import { createGraphStore } from '../../src/webview/store';

describe('GraphStore', () => {
  let store: ReturnType<typeof createGraphStore>;

  beforeEach(() => {
    store = createGraphStore();
  });

  it('has correct initial state', () => {
    const state = store.getState();
    expect(state.graphData).toBeNull();
    expect(state.isLoading).toBe(true);
    expect(state.searchQuery).toBe('');
    expect(state.favorites).toEqual(new Set());
    expect(state.directionMode).toBe('arrows');
    expect(state.directionColor).toBe('#475569');
    expect(state.particleSpeed).toBe(0.005);
    expect(state.particleSize).toBe(4);
    expect(state.showLabels).toBe(true);
    expect(state.graphMode).toBe('2d');
    expect(state.activePanel).toBe('none');
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

  it('handles GROUPS_UPDATED message', () => {
    const groups = [{ id: 'g1', pattern: 'src/**', color: '#ff0000' }];
    store.getState().handleExtensionMessage({
      type: 'GROUPS_UPDATED',
      payload: { groups },
    });
    expect(store.getState().groups).toEqual(groups);
  });

  it('handles FILTER_PATTERNS_UPDATED message', () => {
    store.getState().handleExtensionMessage({
      type: 'FILTER_PATTERNS_UPDATED',
      payload: { patterns: ['*.test.ts'], pluginPatterns: ['*.uid'] },
    });
    expect(store.getState().filterPatterns).toEqual(['*.test.ts']);
    expect(store.getState().pluginFilterPatterns).toEqual(['*.uid']);
  });

  it('handles VIEWS_UPDATED message', () => {
    const views = [{ id: 'v1', name: 'Connections', icon: 'graph', description: '', active: true }];
    store.getState().handleExtensionMessage({
      type: 'VIEWS_UPDATED',
      payload: { views, activeViewId: 'v1' },
    });
    expect(store.getState().availableViews).toEqual(views);
    expect(store.getState().activeViewId).toBe('v1');
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

  it('handles PLUGINS_UPDATED message', () => {
    const plugins = [{
      id: 'ts',
      name: 'TypeScript',
      version: '1.0',
      supportedExtensions: ['.ts'],
      status: 'active' as const,
      enabled: true,
      connectionCount: 5,
      rules: [],
    }];
    store.getState().handleExtensionMessage({
      type: 'PLUGINS_UPDATED',
      payload: { plugins },
    });
    expect(store.getState().pluginStatuses).toEqual(plugins);
  });

  it('handles MAX_FILES_UPDATED message', () => {
    store.getState().handleExtensionMessage({
      type: 'MAX_FILES_UPDATED',
      payload: { maxFiles: 1000 },
    });
    expect(store.getState().maxFiles).toBe(1000);
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

  it('has correct initial folderNodeColor state', () => {
    const state = store.getState();
    expect(state.folderNodeColor).toBe('#A1A1AA');
  });

  it('handles FOLDER_NODE_COLOR_UPDATED message', () => {
    store.getState().handleExtensionMessage({
      type: 'FOLDER_NODE_COLOR_UPDATED',
      payload: { folderNodeColor: '#FF0000' },
    });
    expect(store.getState().folderNodeColor).toBe('#FF0000');
  });

  it('handles TOGGLE_DIMENSION message', () => {
    expect(store.getState().graphMode).toBe('2d');
    store.getState().handleExtensionMessage({ type: 'TOGGLE_DIMENSION' });
    expect(store.getState().graphMode).toBe('3d');
    store.getState().handleExtensionMessage({ type: 'TOGGLE_DIMENSION' });
    expect(store.getState().graphMode).toBe('2d');
  });

  it('handles CYCLE_VIEW message', () => {
    // Set up available views
    store.getState().handleExtensionMessage({
      type: 'VIEWS_UPDATED',
      payload: {
        views: [
          { id: 'codegraphy.connections', name: 'Connections', icon: 'graph', description: '', active: true },
          { id: 'codegraphy.depth-graph', name: 'Depth Graph', icon: 'target', description: '', active: false },
        ],
        activeViewId: 'codegraphy.connections',
      },
    });
    store.getState().handleExtensionMessage({ type: 'CYCLE_VIEW' });
    // Should have sent a CHANGE_VIEW message
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages = (globalThis as any).__vscodeSentMessages;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const changeViewMsg = messages.find((m: any) => m.type === 'CHANGE_VIEW');
    expect(changeViewMsg).toBeTruthy();
    expect(changeViewMsg.payload.viewId).toBe('codegraphy.depth-graph');
  });

  it('handles CYCLE_LAYOUT message', () => {
    // dagMode starts as null, cycling should go to 'radialout'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).__vscodeSentMessages.length = 0;
    store.getState().handleExtensionMessage({ type: 'CYCLE_LAYOUT' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages = (globalThis as any).__vscodeSentMessages;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dagMsg = messages.find((m: any) => m.type === 'UPDATE_DAG_MODE');
    expect(dagMsg).toBeTruthy();
    expect(dagMsg.payload.dagMode).toBe('radialout');
  });
});
