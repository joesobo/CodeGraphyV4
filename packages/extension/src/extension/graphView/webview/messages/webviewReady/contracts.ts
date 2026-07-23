import type { IGraphData } from '../../../../../shared/graph/contracts';
import type { IPluginFilterPatternGroup } from '../../../../../shared/protocol/extensionToWebview';
import type { NodeSizeMode } from '../../../../../shared/settings/modes';

export interface GraphViewReadyState {
  maxFiles: number;
  showFps?: boolean;
  verboseDiagnostics: boolean;
  depthMode?: boolean;
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
  sendDecorations(): void;
  sendPluginStatuses?(): void;
  sendPluginWebviewInjections(): void;
  sendActiveFile(): void;
  waitForFirstWorkspaceReady(): PromiseLike<void>;
  notifyWebviewReady(): void;
}
