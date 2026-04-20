import type { DagMode, NodeSizeMode } from '../../../../shared/settings/modes';

export interface GraphViewReadyState {
  maxFiles: number;
  playbackSpeed: number;
  depthMode?: boolean;
  dagMode: DagMode;
  nodeSizeMode: NodeSizeMode;
  focusedFile: string | undefined;
  hasWorkspace: boolean;
  firstAnalysis: boolean;
  readyNotified: boolean;
}

export interface GraphViewReadyHandlers {
  getFilterPatterns(): string[];
  getPluginFilterPatterns(): string[];
  getConfig<T>(key: string, defaultValue: T): T;
  loadGroupsAndFilterPatterns(): void;
  loadDisabledRulesAndPlugins(): void;
  sendDepthState(): void;
  sendGraphControls(): void;
  loadAndSendData(): void;
  sendFavorites(): void;
  sendSettings(): void;
  sendPhysicsSettings(): void;
  sendGroupsUpdated(): void;
  sendMessage(message: { type: string; payload: unknown }): void;
  sendCachedTimeline(): Promise<void>;
  sendDecorations(): void;
  sendContextMenuItems(): void;
  sendPluginExporters?(): void;
  sendPluginToolbarActions?(): void;
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
  handlers.sendDepthState();
  handlers.sendGraphControls();
  handlers.loadAndSendData();
  handlers.sendFavorites();
  handlers.sendSettings();
  handlers.sendPhysicsSettings();
  handlers.sendGroupsUpdated();
  handlers.sendMessage({
    type: 'FILTER_PATTERNS_UPDATED',
    payload: {
      patterns: handlers.getFilterPatterns(),
      pluginPatterns: handlers.getPluginFilterPatterns(),
      disabledCustomPatterns: handlers.getConfig('disabledCustomFilterPatterns', []),
      disabledPluginPatterns: handlers.getConfig('disabledPluginFilterPatterns', []),
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
    type: 'DEPTH_MODE_UPDATED',
    payload: { depthMode: state.depthMode ?? false },
  });
  handlers.sendMessage({
    type: 'DAG_MODE_UPDATED',
    payload: { dagMode: state.dagMode },
  });
  handlers.sendMessage({
    type: 'NODE_SIZE_MODE_UPDATED',
    payload: { nodeSizeMode: state.nodeSizeMode },
  });
  handlers.sendDecorations();
  handlers.sendContextMenuItems();
  handlers.sendPluginExporters?.();
  handlers.sendPluginToolbarActions?.();
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
