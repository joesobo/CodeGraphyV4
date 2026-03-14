import type { DagMode, NodeSizeMode } from '../../../shared/types';

export interface GraphViewReadyState {
  filterPatterns: string[];
  pluginFilterPatterns: string[];
  maxFiles: number;
  playbackSpeed: number;
  dagMode: DagMode;
  nodeSizeMode: NodeSizeMode;
  folderNodeColor: string;
  hasWorkspace: boolean;
  firstAnalysis: boolean;
  webviewReadyNotified: boolean;
}

export interface GraphViewReadyHandlers {
  loadGroupsAndFilterPatterns(): void;
  loadDisabledRulesAndPlugins(): void;
  analyzeAndSendData(): void;
  sendFavorites(): void;
  sendSettings(): void;
  sendPhysicsSettings(): void;
  sendGroupsUpdated(): void;
  sendMessage(message: { type: string; payload: unknown }): void;
  sendCachedTimeline(): void;
  sendDecorations(): void;
  sendContextMenuItems(): void;
  sendPluginWebviewInjections(): void;
  waitForFirstWorkspaceReady(): PromiseLike<void>;
  notifyWebviewReady(): void;
}

export async function applyWebviewReady(
  state: GraphViewReadyState,
  handlers: GraphViewReadyHandlers,
): Promise<boolean> {
  handlers.loadGroupsAndFilterPatterns();
  handlers.loadDisabledRulesAndPlugins();
  handlers.analyzeAndSendData();
  handlers.sendFavorites();
  handlers.sendSettings();
  handlers.sendPhysicsSettings();
  handlers.sendGroupsUpdated();
  handlers.sendMessage({
    type: 'FILTER_PATTERNS_UPDATED',
    payload: {
      patterns: state.filterPatterns,
      pluginPatterns: state.pluginFilterPatterns,
    },
  });
  handlers.sendMessage({
    type: 'MAX_FILES_UPDATED',
    payload: { maxFiles: state.maxFiles },
  });
  handlers.sendCachedTimeline();
  handlers.sendMessage({
    type: 'PLAYBACK_SPEED_UPDATED',
    payload: { speed: state.playbackSpeed },
  });
  handlers.sendMessage({
    type: 'DAG_MODE_UPDATED',
    payload: { dagMode: state.dagMode },
  });
  handlers.sendMessage({
    type: 'NODE_SIZE_MODE_UPDATED',
    payload: { nodeSizeMode: state.nodeSizeMode },
  });
  handlers.sendMessage({
    type: 'FOLDER_NODE_COLOR_UPDATED',
    payload: { folderNodeColor: state.folderNodeColor },
  });
  handlers.sendDecorations();
  handlers.sendContextMenuItems();
  handlers.sendPluginWebviewInjections();

  if (state.hasWorkspace && state.firstAnalysis) {
    await handlers.waitForFirstWorkspaceReady();
  }

  if (state.webviewReadyNotified) {
    return true;
  }

  handlers.notifyWebviewReady();
  return true;
}
