import type { IGraphData } from '../../../../shared/graph/types';
import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';
import type { DagMode, NodeSizeMode } from '../../../../shared/settings/modes';
import {
  dispatchGraphViewPluginGroupToggleMessage,
  dispatchGraphViewPluginSectionToggleMessage,
} from './pluginHiddenGroups';
import { dispatchGraphViewPluginReadyMessage } from './pluginReady';
import { applyPluginContextMenuAction } from '../pluginMessages/contextMenu';
import { applyPluginInteraction } from '../pluginMessages/interaction';

export interface GraphViewPluginMessageContext {
  getFilterPatterns(): string[];
  getPluginFilterPatterns(): string[];
  getMaxFiles(): number;
  getPlaybackSpeed(): number;
  getDagMode(): DagMode;
  getNodeSizeMode(): NodeSizeMode;
  getFolderNodeColor(): string;
  getFocusedFile(): string | undefined;
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
  sendActiveFile(): void;
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
  readyNotified?: boolean;
}

export async function dispatchGraphViewPluginMessage(
  message: WebviewToExtensionMessage,
  context: GraphViewPluginMessageContext,
): Promise<GraphViewPluginMessageResult> {
  switch (message.type) {
    case 'WEBVIEW_READY':
      return {
        handled: true,
        readyNotified: await dispatchGraphViewPluginReadyMessage(message, context),
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
      await dispatchGraphViewPluginGroupToggleMessage(message, context);
      return { handled: true };

    case 'TOGGLE_PLUGIN_SECTION_DISABLED':
      await dispatchGraphViewPluginSectionToggleMessage(message, context);
      return { handled: true };

    default:
      return { handled: false };
  }
}
