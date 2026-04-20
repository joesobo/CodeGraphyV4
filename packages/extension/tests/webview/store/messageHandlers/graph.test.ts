import { describe, expect, it, vi } from 'vitest';
import {
  handleActiveFileUpdated,
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
  handleLegendsUpdated,
  handleMaxFilesUpdated,
  handlePhysicsSettingsUpdated,
  handleSettingsUpdated,
  handleShowLabelsUpdated,
} from '../../../../src/webview/store/messageHandlers/graph';
import type { IStoreFields } from '../../../../src/webview/store/messageTypes';
import type { IGraphControlsSnapshot } from '../../../../src/shared/graphControls/contracts';

function createState(
  overrides: Partial<IStoreFields> = {},
): IStoreFields {
  return {
    graphData: null,
    graphHasIndex: false,
    graphIsIndexing: false,
    graphIndexProgress: null,
    isLoading: true,
    searchQuery: '',
    searchOptions: { matchCase: false, wholeWord: false, regex: false },
    favorites: new Set<string>(),
    bidirectionalMode: 'separate',
    showOrphans: true,
    directionMode: 'none',
    directionColor: '#ffffff',
    particleSpeed: 0,
    particleSize: 1,
    showLabels: true,
    graphMode: '2d',
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
    activePanel: 'none',
    maxFiles: 500,
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
  it('maps graph payload updates into loading and indexing state', () => {
    const payload = { nodes: [{ id: 'src/app.ts', label: 'App', color: '#fff' }], edges: [] };

    expect(handleGraphDataUpdated({ type: 'GRAPH_DATA_UPDATED', payload })).toEqual({
      graphData: payload,
      isLoading: false,
      graphIsIndexing: false,
      graphIndexProgress: null,
    });
  });

  it('maps graph index status and progress payloads', () => {
    expect(handleGraphIndexStatusUpdated({
      type: 'GRAPH_INDEX_STATUS_UPDATED',
      payload: { hasIndex: true },
    })).toEqual({ graphHasIndex: true });

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
        disabledCustomPatterns: ['custom/**'],
        disabledPluginPatterns: [],
      },
    })).toEqual({
      filterPatterns: ['dist/**'],
      pluginFilterPatterns: ['plugin/**'],
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
