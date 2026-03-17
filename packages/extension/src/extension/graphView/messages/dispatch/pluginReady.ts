import type { DagMode, NodeSizeMode, WebviewToExtensionMessage } from '../../../../shared/types';
import { applyWebviewReady } from '../webviewReady';

type GraphViewReadyMessage = Extract<WebviewToExtensionMessage, { type: 'WEBVIEW_READY' }>;

export interface GraphViewPluginReadyContext {
  getFilterPatterns(): string[];
  getPluginFilterPatterns(): string[];
  getMaxFiles(): number;
  getPlaybackSpeed(): number;
  getDagMode(): DagMode;
  getNodeSizeMode(): NodeSizeMode;
  getFolderNodeColor(): string;
  hasWorkspace(): boolean;
  isFirstAnalysis(): boolean;
  isWebviewReadyNotified(): boolean;
  loadGroupsAndFilterPatterns(): void;
  loadDisabledRulesAndPlugins(): void;
  analyzeAndSendData(): Promise<void>;
  sendFavorites(): void;
  sendSettings(): void;
  sendPhysicsSettings(): void;
  sendGroupsUpdated(): void;
  sendMessage(message: unknown): void;
  sendCachedTimeline(): void;
  sendDecorations(): void;
  sendContextMenuItems(): void;
  sendPluginWebviewInjections(): void;
  waitForFirstWorkspaceReady(): PromiseLike<void>;
  notifyWebviewReady(): void;
}

export async function dispatchGraphViewPluginReadyMessage(
  _message: GraphViewReadyMessage,
  context: GraphViewPluginReadyContext,
): Promise<boolean> {
  return applyWebviewReady(
    {
      filterPatterns: context.getFilterPatterns(),
      pluginFilterPatterns: context.getPluginFilterPatterns(),
      maxFiles: context.getMaxFiles(),
      playbackSpeed: context.getPlaybackSpeed(),
      dagMode: context.getDagMode(),
      nodeSizeMode: context.getNodeSizeMode(),
      folderNodeColor: context.getFolderNodeColor(),
      hasWorkspace: context.hasWorkspace(),
      firstAnalysis: context.isFirstAnalysis(),
      webviewReadyNotified: context.isWebviewReadyNotified(),
    },
    {
      loadGroupsAndFilterPatterns: () => context.loadGroupsAndFilterPatterns(),
      loadDisabledRulesAndPlugins: () => context.loadDisabledRulesAndPlugins(),
      analyzeAndSendData: () => void context.analyzeAndSendData(),
      sendFavorites: () => context.sendFavorites(),
      sendSettings: () => context.sendSettings(),
      sendPhysicsSettings: () => context.sendPhysicsSettings(),
      sendGroupsUpdated: () => context.sendGroupsUpdated(),
      sendMessage: message => context.sendMessage(message),
      sendCachedTimeline: () => context.sendCachedTimeline(),
      sendDecorations: () => context.sendDecorations(),
      sendContextMenuItems: () => context.sendContextMenuItems(),
      sendPluginWebviewInjections: () => context.sendPluginWebviewInjections(),
      waitForFirstWorkspaceReady: () => context.waitForFirstWorkspaceReady(),
      notifyWebviewReady: () => context.notifyWebviewReady(),
    },
  );
}
