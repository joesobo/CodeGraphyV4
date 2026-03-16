/**
 * @fileoverview Message handler map for the graph store.
 * Each entry processes one ExtensionToWebviewMessage type and returns
 * a partial state update (or void for side-effect-only cases).
 * @module webview/storeMessages
 */

import type {
  IGraphData,
  BidirectionalEdgeMode,
  IPhysicsSettings,
  IGroup,
  NodeSizeMode,
  DirectionMode,
  DagMode,
  IPluginStatus,
  ICommitInfo,
  ExtensionToWebviewMessage,
  NodeDecorationPayload,
  EdgeDecorationPayload,
  IPluginContextMenuItem,
  IAvailableView,
} from '../shared/types';
import type { SearchOptions } from './components/SearchBar';

/** All fields that the store can hold — used to type partial state updates. */
export interface IStoreFields {
  graphData: IGraphData | null;
  isLoading: boolean;
  searchQuery: string;
  searchOptions: SearchOptions;
  favorites: Set<string>;
  bidirectionalMode: BidirectionalEdgeMode;
  showOrphans: boolean;
  directionMode: DirectionMode;
  directionColor: string;
  particleSpeed: number;
  particleSize: number;
  showLabels: boolean;
  graphMode: '2d' | '3d';
  nodeSizeMode: NodeSizeMode;
  physicsSettings: IPhysicsSettings;
  depthLimit: number;
  groups: IGroup[];
  filterPatterns: string[];
  pluginFilterPatterns: string[];
  availableViews: IAvailableView[];
  activeViewId: string;
  dagMode: DagMode;
  folderNodeColor: string;
  pluginStatuses: IPluginStatus[];
  nodeDecorations: Record<string, NodeDecorationPayload>;
  edgeDecorations: Record<string, EdgeDecorationPayload>;
  pluginContextMenuItems: IPluginContextMenuItem[];
  activePanel: 'none' | 'settings' | 'plugins';
  maxFiles: number;
  timelineActive: boolean;
  timelineCommits: ICommitInfo[];
  currentCommitSha: string | null;
  isIndexing: boolean;
  indexProgress: { phase: string; current: number; total: number } | null;
  isPlaying: boolean;
  playbackSpeed: number;
}

/** DAG mode cycle order: free-form → radialout → top-down → left-right */
export const DAG_MODE_CYCLE: DagMode[] = [null, 'radialout', 'td', 'lr'];

/** Context passed to handlers that need current state or side-effect capabilities. */
export interface IHandlerContext {
  getState: () => IStoreFields;
  postMessage: (msg: { type: string; payload: unknown }) => void;
}

export type PartialState = Partial<IStoreFields>;

export type MessageHandler = (
  message: ExtensionToWebviewMessage,
  ctx: IHandlerContext,
) => PartialState | void;

function handleGraphDataUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'GRAPH_DATA_UPDATED' }>,
): PartialState {
  return { graphData: message.payload, isLoading: false };
}

function handleFavoritesUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'FAVORITES_UPDATED' }>,
): PartialState {
  return { favorites: new Set(message.payload.favorites) };
}

function handleSettingsUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'SETTINGS_UPDATED' }>,
): PartialState {
  return {
    bidirectionalMode: message.payload.bidirectionalEdges,
    showOrphans: message.payload.showOrphans,
  };
}

function handleGroupsUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'GROUPS_UPDATED' }>,
): PartialState {
  return { groups: message.payload.groups };
}

function handleFilterPatternsUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'FILTER_PATTERNS_UPDATED' }>,
): PartialState {
  return {
    filterPatterns: message.payload.patterns,
    pluginFilterPatterns: message.payload.pluginPatterns,
  };
}

function handleViewsUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'VIEWS_UPDATED' }>,
): PartialState {
  return {
    availableViews: message.payload.views,
    activeViewId: message.payload.activeViewId,
  };
}

function handlePhysicsSettingsUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'PHYSICS_SETTINGS_UPDATED' }>,
): PartialState {
  return { physicsSettings: message.payload };
}

function handleDepthLimitUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'DEPTH_LIMIT_UPDATED' }>,
): PartialState {
  return { depthLimit: message.payload.depthLimit };
}

function handleDirectionSettingsUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'DIRECTION_SETTINGS_UPDATED' }>,
): PartialState {
  return {
    directionMode: message.payload.directionMode,
    directionColor: message.payload.directionColor,
    particleSpeed: message.payload.particleSpeed,
    particleSize: message.payload.particleSize,
  };
}

function handleShowLabelsUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'SHOW_LABELS_UPDATED' }>,
): PartialState {
  return { showLabels: message.payload.showLabels };
}

function handlePluginsUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'PLUGINS_UPDATED' }>,
): PartialState {
  return { pluginStatuses: message.payload.plugins };
}

function handleMaxFilesUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'MAX_FILES_UPDATED' }>,
): PartialState {
  return { maxFiles: message.payload.maxFiles };
}

function handleIndexProgress(
  message: Extract<ExtensionToWebviewMessage, { type: 'INDEX_PROGRESS' }>,
): PartialState {
  return { isIndexing: true, indexProgress: message.payload };
}

function handleTimelineData(
  message: Extract<ExtensionToWebviewMessage, { type: 'TIMELINE_DATA' }>,
): PartialState {
  return {
    isIndexing: false,
    indexProgress: null,
    timelineActive: true,
    timelineCommits: message.payload.commits,
    currentCommitSha: message.payload.currentSha,
  };
}

function handleCommitGraphData(
  message: Extract<ExtensionToWebviewMessage, { type: 'COMMIT_GRAPH_DATA' }>,
): PartialState {
  return {
    currentCommitSha: message.payload.sha,
    graphData: message.payload.graphData,
    isLoading: false,
  };
}

function handlePlaybackSpeedUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'PLAYBACK_SPEED_UPDATED' }>,
): PartialState {
  return { playbackSpeed: message.payload.speed };
}

function handleCacheInvalidated(): PartialState {
  return {
    timelineActive: false,
    timelineCommits: [],
    currentCommitSha: null,
    isPlaying: false,
    isIndexing: false,
    indexProgress: null,
  };
}

function handlePlaybackEnded(): PartialState {
  return { isPlaying: false };
}

function handleDecorationsUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'DECORATIONS_UPDATED' }>,
): PartialState {
  return {
    nodeDecorations: message.payload.nodeDecorations,
    edgeDecorations: message.payload.edgeDecorations,
  };
}

function handleContextMenuItems(
  message: Extract<ExtensionToWebviewMessage, { type: 'CONTEXT_MENU_ITEMS' }>,
): PartialState {
  return { pluginContextMenuItems: message.payload.items };
}

function handleDagModeUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'DAG_MODE_UPDATED' }>,
): PartialState {
  return { dagMode: message.payload.dagMode };
}

function handleFolderNodeColorUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'FOLDER_NODE_COLOR_UPDATED' }>,
): PartialState {
  return { folderNodeColor: message.payload.folderNodeColor };
}

function handleNodeSizeModeUpdated(
  message: Extract<ExtensionToWebviewMessage, { type: 'NODE_SIZE_MODE_UPDATED' }>,
): PartialState {
  return { nodeSizeMode: message.payload.nodeSizeMode };
}

function handleCycleView(
  _message: ExtensionToWebviewMessage,
  ctx: IHandlerContext,
): void {
  const { availableViews, activeViewId } = ctx.getState();
  if (availableViews.length === 0) return;
  const idx = availableViews.findIndex((view) => view.id === activeViewId);
  const next = availableViews[(idx + 1) % availableViews.length];
  ctx.postMessage({ type: 'CHANGE_VIEW', payload: { viewId: next.id } });
}

function handleCycleLayout(
  _message: ExtensionToWebviewMessage,
  ctx: IHandlerContext,
): void {
  const { dagMode } = ctx.getState();
  const idx = DAG_MODE_CYCLE.indexOf(dagMode);
  const nextMode = DAG_MODE_CYCLE[(idx + 1) % DAG_MODE_CYCLE.length];
  ctx.postMessage({ type: 'UPDATE_DAG_MODE', payload: { dagMode: nextMode } });
}

function handleToggleDimension(
  _message: ExtensionToWebviewMessage,
  ctx: IHandlerContext,
): PartialState {
  const { graphMode } = ctx.getState();
  return { graphMode: graphMode === '2d' ? '3d' : '2d' };
}

/**
 * Map from message type to handler function.
 * Handlers return a partial state update, or void for side-effect-only messages.
 */
export const MESSAGE_HANDLERS: Record<
  string,
  (msg: ExtensionToWebviewMessage, ctx: IHandlerContext) => PartialState | void
> = {
  GRAPH_DATA_UPDATED: (msg) =>
    handleGraphDataUpdated(msg as Extract<ExtensionToWebviewMessage, { type: 'GRAPH_DATA_UPDATED' }>),
  FAVORITES_UPDATED: (msg) =>
    handleFavoritesUpdated(msg as Extract<ExtensionToWebviewMessage, { type: 'FAVORITES_UPDATED' }>),
  SETTINGS_UPDATED: (msg) =>
    handleSettingsUpdated(msg as Extract<ExtensionToWebviewMessage, { type: 'SETTINGS_UPDATED' }>),
  GROUPS_UPDATED: (msg) =>
    handleGroupsUpdated(msg as Extract<ExtensionToWebviewMessage, { type: 'GROUPS_UPDATED' }>),
  FILTER_PATTERNS_UPDATED: (msg) =>
    handleFilterPatternsUpdated(msg as Extract<ExtensionToWebviewMessage, { type: 'FILTER_PATTERNS_UPDATED' }>),
  VIEWS_UPDATED: (msg) =>
    handleViewsUpdated(msg as Extract<ExtensionToWebviewMessage, { type: 'VIEWS_UPDATED' }>),
  PHYSICS_SETTINGS_UPDATED: (msg) =>
    handlePhysicsSettingsUpdated(msg as Extract<ExtensionToWebviewMessage, { type: 'PHYSICS_SETTINGS_UPDATED' }>),
  DEPTH_LIMIT_UPDATED: (msg) =>
    handleDepthLimitUpdated(msg as Extract<ExtensionToWebviewMessage, { type: 'DEPTH_LIMIT_UPDATED' }>),
  DIRECTION_SETTINGS_UPDATED: (msg) =>
    handleDirectionSettingsUpdated(msg as Extract<ExtensionToWebviewMessage, { type: 'DIRECTION_SETTINGS_UPDATED' }>),
  SHOW_LABELS_UPDATED: (msg) =>
    handleShowLabelsUpdated(msg as Extract<ExtensionToWebviewMessage, { type: 'SHOW_LABELS_UPDATED' }>),
  PLUGINS_UPDATED: (msg) =>
    handlePluginsUpdated(msg as Extract<ExtensionToWebviewMessage, { type: 'PLUGINS_UPDATED' }>),
  MAX_FILES_UPDATED: (msg) =>
    handleMaxFilesUpdated(msg as Extract<ExtensionToWebviewMessage, { type: 'MAX_FILES_UPDATED' }>),
  INDEX_PROGRESS: (msg) =>
    handleIndexProgress(msg as Extract<ExtensionToWebviewMessage, { type: 'INDEX_PROGRESS' }>),
  TIMELINE_DATA: (msg) =>
    handleTimelineData(msg as Extract<ExtensionToWebviewMessage, { type: 'TIMELINE_DATA' }>),
  COMMIT_GRAPH_DATA: (msg) =>
    handleCommitGraphData(msg as Extract<ExtensionToWebviewMessage, { type: 'COMMIT_GRAPH_DATA' }>),
  PLAYBACK_SPEED_UPDATED: (msg) =>
    handlePlaybackSpeedUpdated(msg as Extract<ExtensionToWebviewMessage, { type: 'PLAYBACK_SPEED_UPDATED' }>),
  CACHE_INVALIDATED: () => handleCacheInvalidated(),
  PLAYBACK_ENDED: () => handlePlaybackEnded(),
  DECORATIONS_UPDATED: (msg) =>
    handleDecorationsUpdated(msg as Extract<ExtensionToWebviewMessage, { type: 'DECORATIONS_UPDATED' }>),
  CONTEXT_MENU_ITEMS: (msg) =>
    handleContextMenuItems(msg as Extract<ExtensionToWebviewMessage, { type: 'CONTEXT_MENU_ITEMS' }>),
  PLUGIN_WEBVIEW_INJECT: () => undefined,
  DAG_MODE_UPDATED: (msg) =>
    handleDagModeUpdated(msg as Extract<ExtensionToWebviewMessage, { type: 'DAG_MODE_UPDATED' }>),
  FOLDER_NODE_COLOR_UPDATED: (msg) =>
    handleFolderNodeColorUpdated(msg as Extract<ExtensionToWebviewMessage, { type: 'FOLDER_NODE_COLOR_UPDATED' }>),
  NODE_SIZE_MODE_UPDATED: (msg) =>
    handleNodeSizeModeUpdated(msg as Extract<ExtensionToWebviewMessage, { type: 'NODE_SIZE_MODE_UPDATED' }>),
  CYCLE_VIEW: handleCycleView,
  CYCLE_LAYOUT: handleCycleLayout,
  TOGGLE_DIMENSION: handleToggleDimension,
};
