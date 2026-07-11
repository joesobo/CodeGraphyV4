import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';
import type { IPluginFilterPatternGroup } from '../../../../shared/protocol/extensionToWebview';
import type { IGraphData } from '../../../../shared/graph/contracts';
import type { DagMode, NodeSizeMode } from '../../../../shared/settings/modes';
import { applyWebviewReady } from '../messages/ready';

type GraphViewReadyMessage = Extract<WebviewToExtensionMessage, { type: 'WEBVIEW_READY' }>;

export interface GraphViewPluginReadyContext {
  getGraphData(): IGraphData;
  getFilterPatterns(): string[];
  getPluginFilterPatterns(): string[];
  getPluginFilterGroups?: () => IPluginFilterPatternGroup[];
  getConfig<T>(key: string, defaultValue: T): T;
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
  sendNativeDecorations?(): void;
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

export async function dispatchGraphViewPluginReadyMessage(
  _message: GraphViewReadyMessage,
  context: GraphViewPluginReadyContext,
): Promise<boolean> {
  return applyWebviewReady(
    {
      maxFiles: context.getMaxFiles(),
      verboseDiagnostics: context.getConfig('verboseDiagnostics', false),
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
      getGraphData: () => context.getGraphData(),
      getFilterPatterns: () => context.getFilterPatterns(),
      getPluginFilterPatterns: () => context.getPluginFilterPatterns(),
      getPluginFilterGroups: () => context.getPluginFilterGroups?.() ?? [],
      getConfig: (key, defaultValue) => context.getConfig(key, defaultValue),
      loadGroupsAndFilterPatterns: () => context.loadGroupsAndFilterPatterns(),
      loadDisabledRulesAndPlugins: () => context.loadDisabledRulesAndPlugins(),
      sendDepthState: () => context.sendDepthState(),
      sendGraphControls: () => context.sendGraphControls(),
      loadAndSendData: () => context.loadAndSendData(),
      sendFavorites: () => context.sendFavorites(),
      sendSettings: () => context.sendSettings(),
      sendPhysicsSettings: () => context.sendPhysicsSettings(),
      sendGroupsUpdated: () => context.sendGroupsUpdated(),
      sendMessage: message => context.sendMessage(message),
      sendCachedTimeline: () => context.sendCachedTimeline(),
      sendDecorations: () => context.sendDecorations(),
      sendNativeDecorations: () => context.sendNativeDecorations?.(),
      sendContextMenuItems: () => context.sendContextMenuItems(),
      sendPluginStatuses: () => context.sendPluginStatuses?.(),
      sendPluginExporters: () => context.sendPluginExporters?.(),
      sendPluginToolbarActions: () => context.sendPluginToolbarActions?.(),
      sendGraphViewContributionStatuses: () => context.sendGraphViewContributionStatuses?.(),
      sendPluginWebviewInjections: () => context.sendPluginWebviewInjections(),
      sendActiveFile: () => context.sendActiveFile(),
      waitForFirstWorkspaceReady: () => context.waitForFirstWorkspaceReady(),
      notifyWebviewReady: () => context.notifyWebviewReady(),
    },
  );
}
