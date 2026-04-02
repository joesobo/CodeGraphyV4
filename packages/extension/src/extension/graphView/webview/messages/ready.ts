import type { DagMode, NodeSizeMode } from '../../../../shared/settings/modes';

export interface GraphViewReadyState {
  filterPatterns: string[];
  pluginFilterPatterns: string[];
  maxFiles: number;
  playbackSpeed: number;
  dagMode: DagMode;
  nodeSizeMode: NodeSizeMode;
  folderNodeColor: string;
  focusedFile: string | undefined;
  hasWorkspace: boolean;
  firstAnalysis: boolean;
  readyNotified: boolean;
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
  sendCachedTimeline(): Promise<void>;
  sendDecorations(): void;
  sendContextMenuItems(): void;
  sendPluginWebviewInjections(): void;
  sendActiveFile(): void;
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
  await handlers.sendCachedTimeline();
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
  handlers.sendActiveFile();

  if (state.hasWorkspace && state.firstAnalysis) {
    await handlers.waitForFirstWorkspaceReady();
  }

  if (state.readyNotified) {
    return true;
  }

  handlers.notifyWebviewReady();
  return true;
}
