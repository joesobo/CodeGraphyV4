import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  handleActiveFileUpdated,
  handleAppBootstrapComplete,
  handleDepthLimitRangeUpdated,
  handleDepthLimitUpdated,
  handleDepthModeUpdated,
  handleDirectionSettingsUpdated,
  handleFavoritesUpdated,
  handleFilterPatternsUpdated,
  handleGraphControlsUpdated,
  handleGraphDataUpdated,
  handleGraphIndexProgress,
  handleGraphIndexStatusUpdated,
  handleGraphNodeMetricsUpdated,
  handleLegendsUpdated,
  handleMaxFilesUpdated,
  handlePhysicsSettingsUpdated,
  handleSettingsUpdated,
  handleShowLabelsUpdated,
  handleVerboseDiagnosticsUpdated,
} from '../../../../src/webview/store/messageHandlers/graph';
import type { IStoreFields } from '../../../../src/webview/store/messageTypes';
import type { IGraphControlsSnapshot } from '../../../../src/shared/graphControls/contracts';

function createState(
  overrides: Partial<IStoreFields> = {},
): IStoreFields {
  return {
    graphData: null,
    graphHasIndex: false,
    graphIndexFreshness: 'missing',
    graphIndexDetail: null,
    graphIsIndexing: false,
    graphIndexProgress: null,
    isLoading: true,
    awaitingInitialBootstrap: false,
    bootstrapComplete: false,
    pendingPluginAssetLoads: 0,
    searchQuery: '',
    searchOptions: { matchCase: false, wholeWord: false, regex: false },
    favorites: new Set<string>(),
    pendingFavoriteSnapshot: null,
    bidirectionalMode: 'separate',
    showOrphans: true,
    directionMode: 'none',
    directionColor: '#ffffff',
    particleSpeed: 0,
    particleSize: 1,
    physicsPaused: false,
    showLabels: true,
    cssSnippets: {},
    graphMode: '2d',
    graphViewportScale: null,
    nodeSizeMode: 'uniform',
    physicsSettings: { repelForce: 10, linkDistance: 80, linkForce: 0.15, damping: 0.7, centerForce: 0.1 },
    depthMode: false,
    depthLimit: 2,
    maxDepthLimit: 10,
    legends: [],
    optimisticLegendUpdates: {},
    optimisticUserLegends: null,
    filterPatterns: [],
    pluginFilterPatterns: [],
    pluginFilterGroups: [],
    disabledCustomFilterPatterns: [],
    disabledPluginFilterPatterns: [],
    dagMode: null,
    pluginStatuses: [],
    graphNodeTypes: [],
    graphEdgeTypes: [],
    nodeColors: {},
    nodeVisibility: {},
    edgeVisibility: {},
    nodeDecorations: {},
    edgeDecorations: {},
    pluginContextMenuItems: [],
    pluginExporters: [],
    pluginToolbarActions: [],
    graphViewContributionStatuses: [],
    activePanel: 'none',
    maxFiles: 500,
    verboseDiagnostics: false,
    activeFilePath: null,
    timelineActive: false,
    timelineCommits: [],
    currentCommitSha: null,
    isIndexing: false,
    indexProgress: null,
    isPlaying: false,
    playbackSpeed: 1,
    ...overrides,
  };
}

describe('webview/store/messageHandlers/graph', () => {
  afterEach(() => {
    window.__codegraphyPerformance = undefined;
  });

  it('maps graph payload updates into loading and indexing state', () => {
    const payload = { nodes: [{ id: 'src/app.ts', label: 'App', color: '#fff' }], edges: [] };

    expect(handleGraphDataUpdated({ type: 'GRAPH_DATA_UPDATED', payload })).toEqual({
      graphData: payload,
      isLoading: false,
      graphIsIndexing: false,
      graphIndexProgress: null,
    });
  });

  it('records graph payload receipt for startup timing', () => {
    window.__codegraphyPerformance = { enabled: true, events: [] };
    const payload = {
      nodes: [
        { id: 'src/app.ts', label: 'App', color: '#fff' },
        { id: 'src/lib.ts', label: 'Lib', color: '#fff' },
      ],
      edges: [{ id: 'src/app.ts->src/lib.ts', from: 'src/app.ts', to: 'src/lib.ts', kind: 'import' as const, sources: [] }],
    };

    handleGraphDataUpdated({ type: 'GRAPH_DATA_UPDATED', payload });

    expect(window.__codegraphyPerformance.events).toEqual([
      expect.objectContaining({
        detail: { edgeCount: 1, nodeCount: 2 },
        name: 'extensionMessage.graphDataUpdated',
      }),
    ]);
  });

  it('applies node metric patches to the current graph data', () => {
    const graphData = {
      nodes: [
        { id: 'src/app.ts', label: 'App', color: '#fff', fileSize: 100, churn: 1 },
        { id: 'src/lib.ts', label: 'Lib', color: '#fff', fileSize: 50, churn: 3 },
      ],
      edges: [{ id: 'src/app.ts->src/lib.ts', from: 'src/app.ts', to: 'src/lib.ts', kind: 'import' as const, sources: [] }],
    };
    const state = createState({
      graphData,
      graphIsIndexing: true,
      graphIndexProgress: { phase: 'Updating Graph View', current: 0, total: 1 },
      isLoading: false,
    });

    expect(handleGraphNodeMetricsUpdated(
      {
        type: 'GRAPH_NODE_METRICS_UPDATED',
        payload: {
          nodes: [{ id: 'src/app.ts', fileSize: 120, churn: 2 }],
        },
      },
      { getState: () => state },
    )).toEqual({
      graphData: {
        nodes: [
          { id: 'src/app.ts', label: 'App', color: '#fff', fileSize: 120, churn: 2 },
          graphData.nodes[1],
        ],
        edges: graphData.edges,
      },
      isLoading: false,
      graphIsIndexing: false,
      graphIndexProgress: null,
    });
  });

  it('skips duplicate graph payloads after bootstrap has settled', () => {
    window.__codegraphyPerformance = { enabled: true, events: [] };
    const payload = {
      nodes: [{ id: 'src/app.ts', label: 'App', color: '#fff' }],
      edges: [{ id: 'src/app.ts->src/lib.ts', from: 'src/app.ts', to: 'src/lib.ts', kind: 'import' as const, sources: [] }],
    };
    const state = createState({
      bootstrapComplete: true,
      graphData: JSON.parse(JSON.stringify(payload)),
      graphIsIndexing: false,
      isLoading: false,
    });

    expect(handleGraphDataUpdated(
      { type: 'GRAPH_DATA_UPDATED', payload },
      { getState: () => state },
    )).toBeUndefined();

    expect(window.__codegraphyPerformance.events).toEqual([
      expect.objectContaining({ name: 'extensionMessage.graphDataUpdated' }),
      expect.objectContaining({ name: 'extensionMessage.graphDataSkipped' }),
    ]);
  });

  it('skips duplicate graph payloads while waiting for initial bootstrap completion', () => {
    window.__codegraphyPerformance = { enabled: true, events: [] };
    const payload = {
      nodes: [{ id: 'src/app.ts', label: 'App', color: '#fff' }],
      edges: [{ id: 'src/app.ts->src/lib.ts', from: 'src/app.ts', to: 'src/lib.ts', kind: 'import' as const, sources: [] }],
    };
    const state = createState({
      awaitingInitialBootstrap: true,
      bootstrapComplete: false,
      graphData: JSON.parse(JSON.stringify(payload)),
      graphIsIndexing: false,
      isLoading: true,
    });

    expect(handleGraphDataUpdated(
      { type: 'GRAPH_DATA_UPDATED', payload },
      { getState: () => state },
    )).toBeUndefined();

    expect(window.__codegraphyPerformance.events).toEqual([
      expect.objectContaining({ name: 'extensionMessage.graphDataUpdated' }),
      expect.objectContaining({ name: 'extensionMessage.graphDataSkipped' }),
    ]);
  });

  it('settles initial bootstrap when graph data arrives after bootstrap and plugin assets are ready', () => {
    const payload = { nodes: [{ id: 'src/app.ts', label: 'App', color: '#fff' }], edges: [] };
    const state = createState({
      awaitingInitialBootstrap: true,
      bootstrapComplete: true,
      pendingPluginAssetLoads: 0,
    });

    expect(handleGraphDataUpdated(
      { type: 'GRAPH_DATA_UPDATED', payload },
      { getState: () => state },
    )).toEqual({
      graphData: payload,
      awaitingInitialBootstrap: false,
      isLoading: false,
      graphIsIndexing: false,
      graphIndexProgress: null,
    });
  });

  it('settles initial bootstrap when app bootstrap completes after graph data and plugin assets are ready', () => {
    const state = createState({
      graphData: { nodes: [{ id: 'src/app.ts', label: 'App', color: '#fff' }], edges: [] },
      awaitingInitialBootstrap: true,
      pendingPluginAssetLoads: 0,
      isLoading: true,
    });

    expect(handleAppBootstrapComplete(
      { type: 'APP_BOOTSTRAP_COMPLETE' },
      { getState: () => state },
    )).toEqual({
      bootstrapComplete: true,
      awaitingInitialBootstrap: false,
      isLoading: false,
    });
  });

  it('records app bootstrap completion for startup timing', () => {
    window.__codegraphyPerformance = { enabled: true, events: [] };
    const state = createState({
      graphData: { nodes: [{ id: 'src/app.ts', label: 'App', color: '#fff' }], edges: [] },
    });

    handleAppBootstrapComplete(
      { type: 'APP_BOOTSTRAP_COMPLETE' },
      { getState: () => state },
    );

    expect(window.__codegraphyPerformance.events).toEqual([
      expect.objectContaining({
        detail: { graphReady: true },
        name: 'extensionMessage.appBootstrapComplete',
      }),
    ]);
  });

  it('settles initial bootstrap when graph data and app bootstrap are ready while plugin assets continue loading', () => {
    const state = createState({
      graphData: { nodes: [{ id: 'src/app.ts', label: 'App', color: '#fff' }], edges: [] },
      awaitingInitialBootstrap: true,
      pendingPluginAssetLoads: 1,
      isLoading: true,
    });

    expect(handleAppBootstrapComplete(
      { type: 'APP_BOOTSTRAP_COMPLETE' },
      { getState: () => state },
    )).toEqual({
      bootstrapComplete: true,
      awaitingInitialBootstrap: false,
      isLoading: false,
    });
  });

  it('maps graph index status and progress payloads', () => {
    expect(handleGraphIndexStatusUpdated({
      type: 'GRAPH_INDEX_STATUS_UPDATED',
      payload: {
        hasIndex: true,
        freshness: 'fresh',
        detail: 'CodeGraphy index is fresh.',
      },
    })).toEqual({
      graphHasIndex: true,
      graphIndexFreshness: 'fresh',
      graphIndexDetail: 'CodeGraphy index is fresh.',
      graphIsIndexing: false,
      graphIndexProgress: null,
    });

    expect(handleGraphIndexProgress({
      type: 'GRAPH_INDEX_PROGRESS',
      payload: { phase: 'indexing', current: 2, total: 5 },
    })).toEqual({
      graphIsIndexing: true,
      graphIndexProgress: { phase: 'indexing', current: 2, total: 5 },
    });
  });

  it('maps graph controls and favorites payloads', () => {
    const controls: IGraphControlsSnapshot = {
      nodeTypes: [{ id: 'file', label: 'File', defaultColor: '#A1A1AA', defaultVisible: true }],
      edgeTypes: [{ id: 'import', label: 'Import', defaultColor: '#64748B', defaultVisible: true }],
      nodeColors: { file: '#A1A1AA' },
      nodeVisibility: { file: true },
      edgeVisibility: { import: false },
    };

    expect(handleGraphControlsUpdated({
      type: 'GRAPH_CONTROLS_UPDATED',
      payload: controls,
    })).toEqual({
      graphNodeTypes: controls.nodeTypes,
      graphEdgeTypes: controls.edgeTypes,
      nodeColors: controls.nodeColors,
      nodeVisibility: controls.nodeVisibility,
      edgeVisibility: controls.edgeVisibility,
    });

    const favorites = handleFavoritesUpdated({
      type: 'FAVORITES_UPDATED',
      payload: { favorites: ['src/app.ts', 'src/lib.ts'] },
    });
    expect([...favorites.favorites ?? []]).toEqual(['src/app.ts', 'src/lib.ts']);

  });

  it('skips graph controls updates when extension echoes the current controls', () => {
    const controls: IGraphControlsSnapshot = {
      nodeTypes: [{ id: 'file', label: 'File', defaultColor: '#A1A1AA', defaultVisible: true }],
      edgeTypes: [{ id: 'import', label: 'Import', defaultColor: '#64748B', defaultVisible: true }],
      nodeColors: { file: '#A1A1AA' },
      nodeVisibility: { file: true },
      edgeVisibility: { import: false },
    };
    const state = createState({
      graphNodeTypes: controls.nodeTypes,
      graphEdgeTypes: controls.edgeTypes,
      nodeColors: controls.nodeColors,
      nodeVisibility: controls.nodeVisibility,
      edgeVisibility: controls.edgeVisibility,
    });
    const echoedControls: IGraphControlsSnapshot = {
      nodeTypes: [...controls.nodeTypes],
      edgeTypes: [...controls.edgeTypes],
      nodeColors: { ...controls.nodeColors },
      nodeVisibility: { ...controls.nodeVisibility },
      edgeVisibility: { ...controls.edgeVisibility },
    };

    expect(handleGraphControlsUpdated(
      { type: 'GRAPH_CONTROLS_UPDATED', payload: echoedControls },
      { getState: () => state },
    )).toBeUndefined();
  });

  it('returns only changed graph control fields when extension echoes partial changes', () => {
    const controls: IGraphControlsSnapshot = {
      nodeTypes: [{ id: 'file', label: 'File', defaultColor: '#A1A1AA', defaultVisible: true }],
      edgeTypes: [{ id: 'import', label: 'Import', defaultColor: '#64748B', defaultVisible: true }],
      nodeColors: { file: '#A1A1AA' },
      nodeVisibility: { file: true },
      edgeVisibility: { import: false },
    };
    const state = createState({
      graphNodeTypes: controls.nodeTypes,
      graphEdgeTypes: controls.edgeTypes,
      nodeColors: controls.nodeColors,
      nodeVisibility: controls.nodeVisibility,
      edgeVisibility: controls.edgeVisibility,
    });
    const nextEdgeVisibility = { import: true };
    const echoedControls: IGraphControlsSnapshot = {
      nodeTypes: [...controls.nodeTypes],
      edgeTypes: [...controls.edgeTypes],
      nodeColors: { ...controls.nodeColors },
      nodeVisibility: { ...controls.nodeVisibility },
      edgeVisibility: nextEdgeVisibility,
    };

    expect(handleGraphControlsUpdated(
      { type: 'GRAPH_CONTROLS_UPDATED', payload: echoedControls },
      { getState: () => state },
    )).toEqual({ edgeVisibility: nextEdgeVisibility });
  });

  it('maps settings and filter payloads', () => {
    expect(handleSettingsUpdated({
      type: 'SETTINGS_UPDATED',
      payload: { bidirectionalEdges: 'combined', showOrphans: false },
    })).toEqual({
      bidirectionalMode: 'combined',
      showOrphans: false,
    });

    expect(handleFilterPatternsUpdated({
      type: 'FILTER_PATTERNS_UPDATED',
      payload: {
        patterns: ['dist/**'],
        pluginPatterns: ['plugin/**'],
        pluginPatternGroups: [],
        disabledCustomPatterns: ['custom/**'],
        disabledPluginPatterns: [],
      },
    })).toEqual({
      filterPatterns: ['dist/**'],
      pluginFilterPatterns: ['plugin/**'],
      pluginFilterGroups: [],
      disabledCustomFilterPatterns: ['custom/**'],
      disabledPluginFilterPatterns: [],
    });
  });

  it('maps depth, direction, physics, labels, max-files, and active-file payloads', () => {
    expect(handleDepthModeUpdated({
      type: 'DEPTH_MODE_UPDATED',
      payload: { depthMode: true },
    })).toEqual({ depthMode: true });

    expect(handlePhysicsSettingsUpdated({
      type: 'PHYSICS_SETTINGS_UPDATED',
      payload: { repelForce: 18, linkDistance: 150, linkForce: 0.2, damping: 0.5, centerForce: 0.3 },
    })).toEqual({
      physicsSettings: { repelForce: 18, linkDistance: 150, linkForce: 0.2, damping: 0.5, centerForce: 0.3 },
    });

    expect(handleDepthLimitUpdated({
      type: 'DEPTH_LIMIT_UPDATED',
      payload: { depthLimit: 7 },
    })).toEqual({ depthLimit: 7 });

    expect(handleDepthLimitRangeUpdated({
      type: 'DEPTH_LIMIT_RANGE_UPDATED',
      payload: { maxDepthLimit: 12 },
    })).toEqual({ maxDepthLimit: 12 });

    expect(handleDirectionSettingsUpdated({
        type: 'DIRECTION_SETTINGS_UPDATED',
        payload: {
        directionMode: 'arrows',
        directionColor: '#22C55E',
        particleSpeed: 3,
        particleSize: 4,
      },
    })).toEqual({
      directionMode: 'arrows',
      directionColor: '#22C55E',
      particleSpeed: 3,
      particleSize: 4,
    });

    expect(handleShowLabelsUpdated({
      type: 'SHOW_LABELS_UPDATED',
      payload: { showLabels: false },
    })).toEqual({ showLabels: false });

    expect(handleMaxFilesUpdated({
      type: 'MAX_FILES_UPDATED',
      payload: { maxFiles: 250 },
    })).toEqual({ maxFiles: 250 });

    expect(handleVerboseDiagnosticsUpdated({
      type: 'VERBOSE_DIAGNOSTICS_UPDATED',
      payload: { verboseDiagnostics: true },
    })).toEqual({ verboseDiagnostics: true });

    expect(handleActiveFileUpdated({
      type: 'ACTIVE_FILE_UPDATED',
      payload: { filePath: 'src/app.ts' },
    })).toEqual({ activeFilePath: 'src/app.ts' });

    expect(handleActiveFileUpdated({
      type: 'ACTIVE_FILE_UPDATED',
      payload: { filePath: undefined },
    })).toEqual({ activeFilePath: null });
  });

  it('returns nothing when legends and optimistic updates are unchanged', () => {
    const legends = [{ id: 'src', pattern: 'src/**', color: '#22C55E' }];
    const state = createState({
      legends,
      optimisticLegendUpdates: {},
      optimisticUserLegends: null,
    });

    const result = handleLegendsUpdated(
      {
        type: 'LEGENDS_UPDATED',
        payload: { legends: [{ id: 'src', pattern: 'src/**', color: '#22C55E' }] },
      },
      { getState: () => state, postMessage: vi.fn() },
    );

    expect(result).toBeUndefined();
  });

  it('returns merged legends when the host payload changes them', () => {
    const state = createState({
      legends: [{ id: 'src', pattern: 'src/**', color: '#22C55E' }],
      optimisticLegendUpdates: {},
      optimisticUserLegends: null,
    });

    expect(handleLegendsUpdated(
      {
        type: 'LEGENDS_UPDATED',
        payload: { legends: [{ id: 'src', pattern: 'src/**', color: '#F59E0B' }] },
      },
      { getState: () => state, postMessage: vi.fn() },
    )).toEqual({
      legends: [{ id: 'src', pattern: 'src/**', color: '#F59E0B' }],
      optimisticUserLegends: null,
      optimisticLegendUpdates: {},
    });
  });
});
