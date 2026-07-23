import type { IGraphData } from '../../../../shared/graph/contracts';
import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';
import type { IPluginFilterPatternGroup } from '../../../../shared/protocol/extensionToWebview';
import type { NodeSizeMode } from '../../../../shared/settings/modes';
import { dispatchGraphViewPluginReadyMessage } from './pluginReady';

export interface GraphViewPluginMessageContext {
  getFilterPatterns(): string[];
  getPluginFilterPatterns(): string[];
  getPluginFilterGroups(): IPluginFilterPatternGroup[];
  getConfig<T>(key: string, defaultValue: T): T;
  getMaxFiles(): number;
  getDepthMode(): boolean;
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
  sendDecorations(): void;
  sendPluginStatuses?(): void;
  sendPluginWebviewInjections(): void;
  sendActiveFile(): void;
  waitForFirstWorkspaceReady(): PromiseLike<void>;
  notifyWebviewReady(): void;
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
  switch (message.type) {
    case 'WEBVIEW_READY':
      return {
        handled: true,
        readyNotified: await dispatchGraphViewPluginReadyMessage(message, context),
      };

    default:
      return { handled: false };
  }
}
