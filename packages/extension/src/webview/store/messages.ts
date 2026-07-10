import type { PartialState, IHandlerContext } from './messageTypes';
import {
  handleGraphDataUpdated,
  handleGraphIndexProgress,
  handleGraphIndexStatusUpdated,
  handleGraphControlsUpdated,
  handleFavoritesUpdated,
  handleGraphNodeMetricsUpdated,
  handleSettingsUpdated,
  handleLegendsUpdated,
  handleFilterPatternsUpdated,
  handleDepthModeUpdated,
  handlePhysicsSettingsUpdated,
  handleDepthLimitUpdated,
  handleDepthLimitRangeUpdated,
  handleDirectionSettingsUpdated,
  handleShowLabelsUpdated,
  handleMaxFilesUpdated,
  handleVerboseDiagnosticsUpdated,
  handleActiveFileUpdated,
  handleAppBootstrapComplete,
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
  handlePluginToolbarActionsUpdated,
  handleGraphViewContributionsUpdated,
  handleDagModeUpdated,
  handleNodeSizeModeUpdated,
} from './messageHandlers/plugin';
import {
  handleToggleDepthMode,
  handleCycleLayout,
} from './messageHandlers/toolbar';
import type { ExtensionToWebviewMessage } from '../../shared/protocol/extensionToWebview';

export const MESSAGE_HANDLERS: Record<
  string,
  (msg: ExtensionToWebviewMessage, ctx: IHandlerContext) => PartialState | void
> = {
  GRAPH_DATA_UPDATED: (msg, ctx) =>
    handleGraphDataUpdated(msg as Extract<ExtensionToWebviewMessage, { type: 'GRAPH_DATA_UPDATED' }>, ctx),
  GRAPH_NODE_METRICS_UPDATED: (msg, ctx) =>
    handleGraphNodeMetricsUpdated(
      msg as Extract<ExtensionToWebviewMessage, { type: 'GRAPH_NODE_METRICS_UPDATED' }>,
      ctx,
    ),
  APP_BOOTSTRAP_COMPLETE: (msg, ctx) =>
    handleAppBootstrapComplete(
      msg as Extract<ExtensionToWebviewMessage, { type: 'APP_BOOTSTRAP_COMPLETE' }>,
      ctx,
    ),
  GRAPH_INDEX_STATUS_UPDATED: (msg) =>
    handleGraphIndexStatusUpdated(
      msg as Extract<ExtensionToWebviewMessage, { type: 'GRAPH_INDEX_STATUS_UPDATED' }>
    ),
  GRAPH_INDEX_PROGRESS: (msg) =>
    handleGraphIndexProgress(
      msg as Extract<ExtensionToWebviewMessage, { type: 'GRAPH_INDEX_PROGRESS' }>
    ),
  GRAPH_CONTROLS_UPDATED: (msg, ctx) =>
    handleGraphControlsUpdated(
      msg as Extract<ExtensionToWebviewMessage, { type: 'GRAPH_CONTROLS_UPDATED' }>,
      ctx,
    ),
  FAVORITES_UPDATED: (msg, ctx) =>
    handleFavoritesUpdated(msg as Extract<ExtensionToWebviewMessage, { type: 'FAVORITES_UPDATED' }>, ctx),
  SETTINGS_UPDATED: (msg) =>
    handleSettingsUpdated(msg as Extract<ExtensionToWebviewMessage, { type: 'SETTINGS_UPDATED' }>),
  DEPTH_MODE_UPDATED: (msg) =>
    handleDepthModeUpdated(
      msg as Extract<ExtensionToWebviewMessage, { type: 'DEPTH_MODE_UPDATED' }>
    ),
  LEGENDS_UPDATED: (msg, ctx) =>
    handleLegendsUpdated(
      msg as Extract<ExtensionToWebviewMessage, { type: 'LEGENDS_UPDATED' }>,
      ctx,
    ),
  FILTER_PATTERNS_UPDATED: (msg) =>
    handleFilterPatternsUpdated(msg as Extract<ExtensionToWebviewMessage, { type: 'FILTER_PATTERNS_UPDATED' }>),
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
  VERBOSE_DIAGNOSTICS_UPDATED: (msg) =>
    handleVerboseDiagnosticsUpdated(
      msg as Extract<ExtensionToWebviewMessage, { type: 'VERBOSE_DIAGNOSTICS_UPDATED' }>
    ),
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
  PLUGIN_TOOLBAR_ACTIONS_UPDATED: (msg) =>
    handlePluginToolbarActionsUpdated(msg as Extract<ExtensionToWebviewMessage, { type: 'PLUGIN_TOOLBAR_ACTIONS_UPDATED' }>),
  GRAPH_VIEW_CONTRIBUTIONS_UPDATED: (msg) =>
    handleGraphViewContributionsUpdated(msg as Extract<ExtensionToWebviewMessage, { type: 'GRAPH_VIEW_CONTRIBUTIONS_UPDATED' }>),
  PLUGIN_WEBVIEW_INJECT: () => undefined,
  DAG_MODE_UPDATED: (msg) =>
    handleDagModeUpdated(msg as Extract<ExtensionToWebviewMessage, { type: 'DAG_MODE_UPDATED' }>),
  NODE_SIZE_MODE_UPDATED: (msg) =>
    handleNodeSizeModeUpdated(msg as Extract<ExtensionToWebviewMessage, { type: 'NODE_SIZE_MODE_UPDATED' }>),
  TOGGLE_DEPTH_MODE: handleToggleDepthMode,
  CYCLE_LAYOUT: handleCycleLayout,
};
