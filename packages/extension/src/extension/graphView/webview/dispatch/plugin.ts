import type { IGraphData } from '../../../../shared/graph/contracts';
import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';
import type { IPluginFilterPatternGroup } from '../../../../shared/protocol/extensionToWebview';
import type { DagMode, NodeSizeMode } from '../../../../shared/settings/modes';
import { dispatchGraphViewPluginReadyMessage } from './pluginReady';
import { applyPluginContextMenuAction } from '../pluginMessages/contextMenu';
import { applyPluginExporterAction } from '../pluginMessages/exporter';
import { applyPluginToolbarAction } from '../pluginMessages/toolbarAction';
import { applyPluginInteraction } from '../pluginMessages/interaction';

export interface GraphViewPluginMessageContext {
  getFilterPatterns(): string[];
  getPluginFilterPatterns(): string[];
  getPluginFilterGroups(): IPluginFilterPatternGroup[];
  getConfig<T>(key: string, defaultValue: T): T;
  getMaxFiles(): number;
  getPlaybackSpeed(): number;
  getDepthMode(): boolean;
  getDagMode(): DagMode;
  getNodeSizeMode(): NodeSizeMode;
  getFocusedFile(): string | undefined;
  hasWorkspace(): boolean;
  isFirstAnalysis(): boolean;
  isWebviewReadyNotified(): boolean;
  getGraphData(): IGraphData;
  loadGroupsAndFilterPatterns(): void;
  loadDisabledRulesAndPlugins(): void;
  sendDepthState(): void;
  sendGraphControls(): void;
  loadAndSendData(): Promise<void>;
  analyzeAndSendData(): Promise<void>;
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
  getInteractionPluginApi(pluginId: string):
    | { deliverWebviewMessage(message: { type: string; data: unknown }): void }
    | undefined;
  getContextMenuPluginApi(pluginId: string):
    | { contextMenuItems: ReadonlyArray<{ action(target: unknown): Promise<void> | void }> }
    | undefined;
  getExporterPluginApi?(pluginId: string):
    | { exporters: ReadonlyArray<{ run(): Promise<void> | void }> }
    | undefined;
  getToolbarActionPluginApi?(pluginId: string):
    | { toolbarActions: ReadonlyArray<{ items: ReadonlyArray<{ run(): Promise<void> | void }> }> }
    | undefined;
  emitEvent(event: string, payload: unknown): void;
  findNode(targetId: string): unknown;
  findEdge(targetId: string): unknown;
  logError(message: string, error: unknown): void;
}

export interface GraphViewPluginMessageResult {
  handled: boolean;
  readyNotified?: boolean;
}

export async function dispatchGraphViewPluginMessage(
  message: WebviewToExtensionMessage,
  context: GraphViewPluginMessageContext,
): Promise<GraphViewPluginMessageResult> {
  const getExporterPluginApi = (pluginId: string) => context.getExporterPluginApi?.(pluginId);
  const getToolbarActionPluginApi = (pluginId: string) =>
    context.getToolbarActionPluginApi?.(pluginId);
  const getContextMenuPluginApi = (pluginId: string) => context.getContextMenuPluginApi(pluginId);
  const findNode = (targetId: string) => context.findNode(targetId);
  const findEdge = (targetId: string) => context.findEdge(targetId);
  const logError = (messageText: string, error: unknown) => context.logError(messageText, error);
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
        getPluginApi: getContextMenuPluginApi,
        findNode,
        findEdge,
        logError,
      });
      return { handled: true };

    case 'RUN_PLUGIN_EXPORT':
      await applyPluginExporterAction(message.payload, {
        getPluginApi: getExporterPluginApi,
        logError,
      });
      return { handled: true };

    case 'RUN_PLUGIN_TOOLBAR_ACTION':
      await applyPluginToolbarAction(message.payload, {
        getPluginApi: getToolbarActionPluginApi,
        logError,
      });
      return { handled: true };

    default:
      return { handled: false };
  }
}
