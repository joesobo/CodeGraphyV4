import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';
import type { DagMode, NodeSizeMode } from '../../../../shared/settings/modes';
import { applyWebviewReady } from '../messages/ready';

type GraphViewReadyMessage = Extract<WebviewToExtensionMessage, { type: 'WEBVIEW_READY' }>;

export interface GraphViewPluginReadyContext {
  getFilterPatterns(): string[];
  getPluginFilterPatterns(): string[];
  getMaxFiles(): number;
  getPlaybackSpeed(): number;
  getDepthMode?(): boolean;
  getDagMode(): DagMode;
  getNodeSizeMode(): NodeSizeMode;
  getFocusedFile(): string | undefined;
  hasWorkspace(): boolean;
  isFirstAnalysis(): boolean;
  isWebviewReadyNotified(): boolean;
  loadGroupsAndFilterPatterns(): void;
  loadDisabledRulesAndPlugins(): void;
  sendDepthState(): void;
  sendGraphControls(): void;
  loadAndSendData(): Promise<void>;
  sendFavorites(): void;
  sendSettings(): void;
  sendPhysicsSettings(): void;
  sendGroupsUpdated(): void;
  sendMessage(message: unknown): void;
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

export async function dispatchGraphViewPluginReadyMessage(
  _message: GraphViewReadyMessage,
  context: GraphViewPluginReadyContext,
): Promise<boolean> {
  return applyWebviewReady(
    {
      maxFiles: context.getMaxFiles(),
      playbackSpeed: context.getPlaybackSpeed(),
      depthMode: context.getDepthMode?.() ?? false,
      dagMode: context.getDagMode(),
      nodeSizeMode: context.getNodeSizeMode(),
      focusedFile: context.getFocusedFile(),
      hasWorkspace: context.hasWorkspace(),
      firstAnalysis: context.isFirstAnalysis(),
      readyNotified: context.isWebviewReadyNotified(),
    },
    {
      getFilterPatterns: () => context.getFilterPatterns(),
      getPluginFilterPatterns: () => context.getPluginFilterPatterns(),
      loadGroupsAndFilterPatterns: () => context.loadGroupsAndFilterPatterns(),
      loadDisabledRulesAndPlugins: () => context.loadDisabledRulesAndPlugins(),
      sendDepthState: () => context.sendDepthState(),
      sendGraphControls: () => context.sendGraphControls(),
      loadAndSendData: () => void context.loadAndSendData(),
      sendFavorites: () => context.sendFavorites(),
      sendSettings: () => context.sendSettings(),
      sendPhysicsSettings: () => context.sendPhysicsSettings(),
      sendGroupsUpdated: () => context.sendGroupsUpdated(),
      sendMessage: message => context.sendMessage(message),
      sendCachedTimeline: () => context.sendCachedTimeline(),
      sendDecorations: () => context.sendDecorations(),
      sendContextMenuItems: () => context.sendContextMenuItems(),
      sendPluginExporters: () => context.sendPluginExporters?.(),
      sendPluginToolbarActions: () => context.sendPluginToolbarActions?.(),
      sendPluginWebviewInjections: () => context.sendPluginWebviewInjections(),
      sendActiveFile: () => context.sendActiveFile(),
      waitForFirstWorkspaceReady: () => context.waitForFirstWorkspaceReady(),
      notifyWebviewReady: () => context.notifyWebviewReady(),
    },
  );
}
