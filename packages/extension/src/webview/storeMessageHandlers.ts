/**
 * @fileoverview Message handler map for the graph store.
 * Each handler receives the zustand set/get functions and the typed payload.
 */

import type {
  IGraphData,
  IAvailableView,
  BidirectionalEdgeMode,
  IPhysicsSettings,
  IGroup,
  NodeSizeMode,
  DirectionMode,
  DagMode,
  IPluginStatus,
  ICommitInfo,
  NodeDecorationPayload,
  EdgeDecorationPayload,
  IPluginContextMenuItem,
} from '../shared/types';
import { postMessage } from './lib/vscodeApi';

/** DAG mode cycle order: free-form → radialout → top-down → left-right */
export const DAG_MODE_CYCLE: DagMode[] = [null, 'radialout', 'td', 'lr'];

/** The shape of state the handlers can read/write (subset of GraphState). */
export interface HandlerState {
  graphData: IGraphData | null;
  isLoading: boolean;
  favorites: Set<string>;
  bidirectionalMode: BidirectionalEdgeMode;
  showOrphans: boolean;
  groups: IGroup[];
  filterPatterns: string[];
  pluginFilterPatterns: string[];
  availableViews: IAvailableView[];
  activeViewId: string;
  physicsSettings: IPhysicsSettings;
  depthLimit: number;
  directionMode: DirectionMode;
  directionColor: string;
  particleSpeed: number;
  particleSize: number;
  showLabels: boolean;
  pluginStatuses: IPluginStatus[];
  maxFiles: number;
  isIndexing: boolean;
  indexProgress: { phase: string; current: number; total: number } | null;
  timelineActive: boolean;
  timelineCommits: ICommitInfo[];
  currentCommitSha: string | null;
  isPlaying: boolean;
  playbackSpeed: number;
  nodeDecorations: Record<string, NodeDecorationPayload>;
  edgeDecorations: Record<string, EdgeDecorationPayload>;
  pluginContextMenuItems: IPluginContextMenuItem[];
  dagMode: DagMode;
  folderNodeColor: string;
  nodeSizeMode: NodeSizeMode;
  graphMode: '2d' | '3d';
}

export type StoreSetFn = (partial: Partial<HandlerState>) => void;
export type StoreGetFn = () => HandlerState;
export type MessageHandler = (set: StoreSetFn, get: StoreGetFn, payload: unknown) => void;

export const messageHandlers: Record<string, MessageHandler> = {
  GRAPH_DATA_UPDATED: (set, _get, payload) => {
    set({ graphData: payload as IGraphData, isLoading: false });
  },

  FAVORITES_UPDATED: (set, _get, payload) => {
    const pl = payload as { favorites: string[] };
    set({ favorites: new Set(pl.favorites) });
  },

  SETTINGS_UPDATED: (set, _get, payload) => {
    const pl = payload as { bidirectionalEdges: BidirectionalEdgeMode; showOrphans: boolean };
    set({
      bidirectionalMode: pl.bidirectionalEdges,
      showOrphans: pl.showOrphans,
    });
  },

  GROUPS_UPDATED: (set, _get, payload) => {
    const pl = payload as { groups: IGroup[] };
    set({ groups: pl.groups });
  },

  FILTER_PATTERNS_UPDATED: (set, _get, payload) => {
    const pl = payload as { patterns: string[]; pluginPatterns: string[] };
    set({
      filterPatterns: pl.patterns,
      pluginFilterPatterns: pl.pluginPatterns,
    });
  },

  VIEWS_UPDATED: (set, _get, payload) => {
    const pl = payload as { views: IAvailableView[]; activeViewId: string };
    set({
      availableViews: pl.views,
      activeViewId: pl.activeViewId,
    });
  },

  PHYSICS_SETTINGS_UPDATED: (set, _get, payload) => {
    set({ physicsSettings: payload as IPhysicsSettings });
  },

  DEPTH_LIMIT_UPDATED: (set, _get, payload) => {
    const pl = payload as { depthLimit: number };
    set({ depthLimit: pl.depthLimit });
  },

  DIRECTION_SETTINGS_UPDATED: (set, _get, payload) => {
    const pl = payload as { directionMode: DirectionMode; directionColor: string; particleSpeed: number; particleSize: number };
    set({
      directionMode: pl.directionMode,
      directionColor: pl.directionColor,
      particleSpeed: pl.particleSpeed,
      particleSize: pl.particleSize,
    });
  },

  SHOW_LABELS_UPDATED: (set, _get, payload) => {
    const pl = payload as { showLabels: boolean };
    set({ showLabels: pl.showLabels });
  },

  PLUGINS_UPDATED: (set, _get, payload) => {
    const pl = payload as { plugins: IPluginStatus[] };
    set({ pluginStatuses: pl.plugins });
  },

  MAX_FILES_UPDATED: (set, _get, payload) => {
    const pl = payload as { maxFiles: number };
    set({ maxFiles: pl.maxFiles });
  },

  INDEX_PROGRESS: (set, _get, payload) => {
    set({ isIndexing: true, indexProgress: payload as { phase: string; current: number; total: number } });
  },

  TIMELINE_DATA: (set, _get, payload) => {
    const pl = payload as { commits: ICommitInfo[]; currentSha: string };
    set({
      isIndexing: false,
      indexProgress: null,
      timelineActive: true,
      timelineCommits: pl.commits,
      currentCommitSha: pl.currentSha,
    });
  },

  COMMIT_GRAPH_DATA: (set, _get, payload) => {
    const pl = payload as { sha: string; graphData: IGraphData };
    set({
      currentCommitSha: pl.sha,
      graphData: pl.graphData,
      isLoading: false,
    });
  },

  PLAYBACK_SPEED_UPDATED: (set, _get, payload) => {
    const pl = payload as { speed: number };
    set({ playbackSpeed: pl.speed });
  },

  CACHE_INVALIDATED: (set) => {
    set({
      timelineActive: false,
      timelineCommits: [],
      currentCommitSha: null,
      isPlaying: false,
      isIndexing: false,
      indexProgress: null,
    });
  },

  PLAYBACK_ENDED: (set) => {
    set({ isPlaying: false });
  },

  DECORATIONS_UPDATED: (set, _get, payload) => {
    const pl = payload as { nodeDecorations: Record<string, NodeDecorationPayload>; edgeDecorations: Record<string, EdgeDecorationPayload> };
    set({
      nodeDecorations: pl.nodeDecorations,
      edgeDecorations: pl.edgeDecorations,
    });
  },

  CONTEXT_MENU_ITEMS: (set, _get, payload) => {
    const pl = payload as { items: IPluginContextMenuItem[] };
    set({ pluginContextMenuItems: pl.items });
  },

  // Tier 2: will be implemented later
  PLUGIN_WEBVIEW_INJECT: () => { /* no-op */ },

  DAG_MODE_UPDATED: (set, _get, payload) => {
    const pl = payload as { dagMode: DagMode };
    set({ dagMode: pl.dagMode });
  },

  FOLDER_NODE_COLOR_UPDATED: (set, _get, payload) => {
    const pl = payload as { folderNodeColor: string };
    set({ folderNodeColor: pl.folderNodeColor });
  },

  NODE_SIZE_MODE_UPDATED: (set, _get, payload) => {
    const pl = payload as { nodeSizeMode: NodeSizeMode };
    set({ nodeSizeMode: pl.nodeSizeMode });
  },

  CYCLE_VIEW: (_set, get) => {
    const { availableViews, activeViewId } = get();
    if (availableViews.length === 0) return;
    const idx = availableViews.findIndex(view => view.id === activeViewId);
    const next = availableViews[(idx + 1) % availableViews.length];
    postMessage({ type: 'CHANGE_VIEW', payload: { viewId: next.id } });
  },

  CYCLE_LAYOUT: (_set, get) => {
    const { dagMode } = get();
    const idx = DAG_MODE_CYCLE.indexOf(dagMode);
    const nextMode = DAG_MODE_CYCLE[(idx + 1) % DAG_MODE_CYCLE.length];
    postMessage({ type: 'UPDATE_DAG_MODE', payload: { dagMode: nextMode } });
  },

  TOGGLE_DIMENSION: (set, get) => {
    const { graphMode } = get();
    set({ graphMode: graphMode === '2d' ? '3d' : '2d' });
  },
};
