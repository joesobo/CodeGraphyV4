import type { ExtensionToWebviewMessage } from '../../../../shared/protocol/extensionToWebview';
import type { IPluginFilterPatternGroup } from '../../../../shared/protocol/extensionToWebview';
import type { IPluginUpdateImpactPolicy } from '@codegraphy-dev/plugin-api';
import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';
import type * as vscode from 'vscode';
import { applySettingsUpdateMessage } from './updates/apply';
import { applyCssSnippetMessage } from './cssSnippets';
import { applySettingsDirectionMessage } from './direction';
import { applySettingsToggleMessage } from './toggle';
import type { PluginGraphWorkRequest } from './pluginGraphWork';

export interface GraphViewSettingsMessageState {
  filterPatterns: string[];
  workspaceRoot?: string;
  asWebviewUri?(uri: vscode.Uri): { toString(): string };
}

export interface GraphViewSettingsMessageHandlers {
  getConfig<T>(key: string, defaultValue: T): T;
  updateConfig(key: string, value: unknown): Promise<void>;
  getInstalledPluginDefaultOptions?(pluginId: string): Record<string, unknown> | undefined;
  getInstalledPluginUpdateImpact?(pluginId: string): IPluginUpdateImpactPolicy | undefined;
  reloadWorkspacePlugins(): Promise<void>;
  syncWorkspacePlugins?(): Promise<void>;
  sendPluginStatuses?(): void;
  sendContextMenuItems?(): void;
  sendPluginToolbarActions?(): void;
  sendGraphViewContributionStatuses?(): void;
  sendPluginWebviewInjections?(): void;
  recomputeGroups(): void;
  sendGroupsUpdated(): void;
  smartRebuild(id: string): void;
  schedulePluginGraphWork?(request: PluginGraphWorkRequest): void;
  cancelScheduledPluginGraphWork?(): void;
  sendGraphControls(): void;
  hydrateGraphScope(): Promise<boolean>;
  reprocessGraphScope(): Promise<void>;
  reprocessPluginFiles(pluginIds: readonly string[]): Promise<void>;
  getPluginFilterPatterns(): string[];
  getPluginFilterGroups(): IPluginFilterPatternGroup[];
  analyzeAndSendData(): Promise<void>;
  sendMessage(message: ExtensionToWebviewMessage): void;
  resetAllSettings(): Promise<void>;
}

export async function applySettingsMessage(
  message: WebviewToExtensionMessage,
  state: GraphViewSettingsMessageState,
  handlers: GraphViewSettingsMessageHandlers,
): Promise<boolean> {
  if (await applySettingsUpdateMessage(message, state, handlers)) {
    return true;
  }

  if (await applySettingsDirectionMessage(message, state, handlers)) {
    return true;
  }

  if (await applyCssSnippetMessage(message, state, handlers)) {
    return true;
  }

  return applySettingsToggleMessage(message, state, handlers);
}
