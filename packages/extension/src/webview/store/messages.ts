import type { PartialState, IHandlerContext } from './messageTypes';
import {
  handleGraphDataUpdated,
  handleFavoritesUpdated,
  handleSettingsUpdated,
  handleGroupsUpdated,
  handleFilterPatternsUpdated,
  handleViewsUpdated,
  handlePhysicsSettingsUpdated,
  handleDepthLimitUpdated,
  handleDepthLimitRangeUpdated,
  handleDirectionSettingsUpdated,
  handleShowLabelsUpdated,
  handleMaxFilesUpdated,
  handleActiveFileUpdated,
} from './messageHandlers/graph';
import {
  handleIndexProgress,
  handleTimelineData,
  handleCommitGraphData,
  handlePlaybackSpeedUpdated,
  handleCacheInvalidated,
  handlePlaybackEnded,
} from './messageHandlers/timeline';
import {
  handlePluginsUpdated,
  handleDecorationsUpdated,
  handleContextMenuItems,
  handlePluginExportersUpdated,
  handleDagModeUpdated,
  handleFolderNodeColorUpdated,
  handleNodeSizeModeUpdated,
} from './messageHandlers/plugin';
import {
  handleCycleView,
  handleCycleLayout,
  handleToggleDimension,
} from './messageHandlers/toolbar';
import type { ExtensionToWebviewMessage } from '../../shared/protocol/extensionToWebview';

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
  GROUPS_UPDATED: (msg, ctx) =>
    handleGroupsUpdated(
      msg as Extract<ExtensionToWebviewMessage, { type: 'GROUPS_UPDATED' }>,
      ctx,
    ),
  FILTER_PATTERNS_UPDATED: (msg) =>
    handleFilterPatternsUpdated(msg as Extract<ExtensionToWebviewMessage, { type: 'FILTER_PATTERNS_UPDATED' }>),
  VIEWS_UPDATED: (msg) =>
    handleViewsUpdated(msg as Extract<ExtensionToWebviewMessage, { type: 'VIEWS_UPDATED' }>),
  PHYSICS_SETTINGS_UPDATED: (msg) =>
    handlePhysicsSettingsUpdated(msg as Extract<ExtensionToWebviewMessage, { type: 'PHYSICS_SETTINGS_UPDATED' }>),
  DEPTH_LIMIT_UPDATED: (msg) =>
    handleDepthLimitUpdated(msg as Extract<ExtensionToWebviewMessage, { type: 'DEPTH_LIMIT_UPDATED' }>),
  DEPTH_LIMIT_RANGE_UPDATED: (msg) =>
    handleDepthLimitRangeUpdated(
      msg as Extract<ExtensionToWebviewMessage, { type: 'DEPTH_LIMIT_RANGE_UPDATED' }>
    ),
  DIRECTION_SETTINGS_UPDATED: (msg) =>
    handleDirectionSettingsUpdated(msg as Extract<ExtensionToWebviewMessage, { type: 'DIRECTION_SETTINGS_UPDATED' }>),
  SHOW_LABELS_UPDATED: (msg) =>
    handleShowLabelsUpdated(msg as Extract<ExtensionToWebviewMessage, { type: 'SHOW_LABELS_UPDATED' }>),
  PLUGINS_UPDATED: (msg) =>
    handlePluginsUpdated(msg as Extract<ExtensionToWebviewMessage, { type: 'PLUGINS_UPDATED' }>),
  MAX_FILES_UPDATED: (msg) =>
    handleMaxFilesUpdated(msg as Extract<ExtensionToWebviewMessage, { type: 'MAX_FILES_UPDATED' }>),
  ACTIVE_FILE_UPDATED: (msg) =>
    handleActiveFileUpdated(msg as Extract<ExtensionToWebviewMessage, { type: 'ACTIVE_FILE_UPDATED' }>),
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
  DECORATIONS_UPDATED: (msg, ctx) =>
    handleDecorationsUpdated(
      msg as Extract<ExtensionToWebviewMessage, { type: 'DECORATIONS_UPDATED' }>,
      ctx,
    ),
  CONTEXT_MENU_ITEMS: (msg) =>
    handleContextMenuItems(msg as Extract<ExtensionToWebviewMessage, { type: 'CONTEXT_MENU_ITEMS' }>),
  PLUGIN_EXPORTERS_UPDATED: (msg) =>
    handlePluginExportersUpdated(msg as Extract<ExtensionToWebviewMessage, { type: 'PLUGIN_EXPORTERS_UPDATED' }>),
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
