import type { DagMode, NodeSizeMode } from '../../../../shared/settings/modes';
import type { IPluginFilterPatternGroup } from '../../../../shared/protocol/extensionToWebview';
import type { IGraphData } from '../../../../shared/graph/contracts';

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
  getGraphData(): IGraphData;
  getFilterPatterns(): string[];
  getPluginFilterPatterns(): string[];
  getPluginFilterGroups?: () => IPluginFilterPatternGroup[];
  getConfig<T>(key: string, defaultValue: T): T;
  loadGroupsAndFilterPatterns(): void;
  loadDisabledRulesAndPlugins(): void;
  sendDepthState(): void;
  sendGraphControls(): void;
  loadAndSendData(): void | Promise<void>;
  sendFavorites(): void;
  sendSettings(): void;
  sendPhysicsSettings(): void;
  sendGroupsUpdated(): void;
  sendMessage(message: { type: string; payload?: unknown }): void;
  sendCachedTimeline(): Promise<void>;
  sendDecorations(): void;
  sendContextMenuItems(): void;
  sendPluginStatuses?(): void;
  sendPluginExporters?(): void;
  sendPluginToolbarActions?(): void;
  sendGraphViewContributionStatuses?(): void;
  sendPluginWebviewInjections(): void;
  sendActiveFile(): void;
  waitForFirstWorkspaceReady(): PromiseLike<void>;
  notifyWebviewReady(): void;
}

export function replayWebviewReadySettings(
  state: GraphViewReadyState,
  handlers: GraphViewReadyHandlers,
): void {
  handlers.loadGroupsAndFilterPatterns();
  handlers.loadDisabledRulesAndPlugins();
  handlers.sendDepthState();
  handlers.sendGraphControls();
  handlers.sendFavorites();
  handlers.sendSettings();
  handlers.sendPhysicsSettings();
  handlers.sendGroupsUpdated();
  handlers.sendMessage({
    type: 'FILTER_PATTERNS_UPDATED',
    payload: {
      patterns: handlers.getFilterPatterns(),
      pluginPatterns: handlers.getPluginFilterPatterns(),
      pluginPatternGroups: handlers.getPluginFilterGroups?.() ?? [],
      disabledCustomPatterns: handlers.getConfig('disabledCustomFilterPatterns', []),
      disabledPluginPatterns: handlers.getConfig('disabledPluginFilterPatterns', []),
    },
  });
  handlers.sendMessage({
    type: 'MAX_FILES_UPDATED',
    payload: { maxFiles: state.maxFiles },
  });
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
  handlers.sendGraphViewContributionStatuses?.();
  handlers.sendPluginWebviewInjections();
  handlers.sendActiveFile();
}

export function replayWebviewReadyBootstrap(
  state: GraphViewReadyState,
  handlers: GraphViewReadyHandlers,
): void {
  replayWebviewReadySettings(state, handlers);
  replayWebviewReadyGraphBootstrap(handlers);
}

export function replayWebviewReadyGraphBootstrap(
  handlers: Pick<GraphViewReadyHandlers, 'getGraphData' | 'sendMessage'>,
): void {
  handlers.sendMessage({ type: 'GRAPH_DATA_UPDATED', payload: handlers.getGraphData() });
  handlers.sendMessage({ type: 'APP_BOOTSTRAP_COMPLETE' });
}

export function shouldWaitForFirstWorkspaceGraph(state: GraphViewReadyState): boolean {
  return state.hasWorkspace && state.firstAnalysis;
}

export async function replayDuplicateWebviewReady(
  state: GraphViewReadyState,
  handlers: GraphViewReadyHandlers,
): Promise<void> {
  replayWebviewReadySettings(state, handlers);

  if (shouldWaitForFirstWorkspaceGraph(state)) {
    return;
  }

  replayWebviewReadyGraphBootstrap(handlers);
}

export async function applyWebviewReady(
  state: GraphViewReadyState,
  handlers: GraphViewReadyHandlers,
): Promise<boolean> {
  replayWebviewReadySettings(state, handlers);

  await handlers.sendCachedTimeline();
  await handlers.loadAndSendData();
  handlers.sendPluginStatuses?.();

  handlers.sendMessage({ type: 'APP_BOOTSTRAP_COMPLETE' });

  if (state.readyNotified) {
    return true;
  }

  handlers.notifyWebviewReady();
  return true;
}
