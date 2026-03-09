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
    expect(state.showArrows).toBe(true);
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

  it('handles SHOW_ARROWS_UPDATED message', () => {
    store.getState().handleExtensionMessage({
      type: 'SHOW_ARROWS_UPDATED',
      payload: { showArrows: false },
    });
    expect(store.getState().showArrows).toBe(false);
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
});
