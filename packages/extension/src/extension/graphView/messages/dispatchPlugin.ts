import type {
  DagMode,
  IGraphData,
  NodeSizeMode,
  WebviewToExtensionMessage,
} from '../../../shared/types';
import { applyPluginContextMenuAction } from './pluginContextMenu';
import { applyPluginGroupToggle } from './pluginGroupToggle';
import { applyPluginInteraction } from './pluginInteraction';
import { applyPluginSectionToggle } from './pluginSectionToggle';
import { applyWebviewReady } from './ready';

export interface GraphViewPluginMessageContext {
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
  getHiddenPluginGroupIds(): Set<string>;
  getGraphData(): IGraphData;
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
  getInteractionPluginApi(pluginId: string):
    | { deliverWebviewMessage(message: { type: string; data: unknown }): void }
    | undefined;
  getContextMenuPluginApi(pluginId: string):
    | { contextMenuItems: ReadonlyArray<{ action(target: unknown): Promise<void> | void }> }
    | undefined;
  emitEvent(event: string, payload: unknown): void;
  findNode(targetId: string): unknown;
  findEdge(targetId: string): unknown;
  logError(message: string, error: unknown): void;
  updateHiddenPluginGroups(groupIds: string[]): Promise<void>;
  recomputeGroups(): void;
}

export interface GraphViewPluginMessageResult {
  handled: boolean;
  webviewReadyNotified?: boolean;
}

export async function dispatchGraphViewPluginMessage(
  message: WebviewToExtensionMessage,
  context: GraphViewPluginMessageContext,
): Promise<GraphViewPluginMessageResult> {
  switch (message.type) {
    case 'WEBVIEW_READY':
      return {
        handled: true,
        webviewReadyNotified: await applyWebviewReady(
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
        ),
      };

    case 'GRAPH_INTERACTION':
      applyPluginInteraction(message.payload, {
        getPluginApi: pluginId => context.getInteractionPluginApi(pluginId),
        emitEvent: (event, payload) => context.emitEvent(event, payload),
      });
      return { handled: true };

    case 'PLUGIN_CONTEXT_MENU_ACTION':
      await applyPluginContextMenuAction(message.payload, {
        getPluginApi: pluginId => context.getContextMenuPluginApi(pluginId),
        findNode: targetId => context.findNode(targetId),
        findEdge: targetId => context.findEdge(targetId),
        logError: (label, error) => context.logError(label, error),
      });
      return { handled: true };

    case 'TOGGLE_PLUGIN_GROUP_DISABLED':
      await applyPluginGroupToggle(message.payload, {
        hiddenPluginGroupIds: context.getHiddenPluginGroupIds(),
        updateHiddenPluginGroups: groupIds => context.updateHiddenPluginGroups(groupIds),
        recomputeGroups: () => context.recomputeGroups(),
        sendGroupsUpdated: () => context.sendGroupsUpdated(),
      });
      return { handled: true };

    case 'TOGGLE_PLUGIN_SECTION_DISABLED':
      await applyPluginSectionToggle(message.payload, {
        hiddenPluginGroupIds: context.getHiddenPluginGroupIds(),
        updateHiddenPluginGroups: groupIds => context.updateHiddenPluginGroups(groupIds),
        recomputeGroups: () => context.recomputeGroups(),
        sendGroupsUpdated: () => context.sendGroupsUpdated(),
      });
      return { handled: true };

    default:
      return { handled: false };
  }
}
