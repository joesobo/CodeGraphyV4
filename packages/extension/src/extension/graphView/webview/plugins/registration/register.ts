import type * as vscode from 'vscode';
import type { IPlugin } from '../../../../../core/plugins/types/contracts';
import { runExternalPluginRegistrationFollowUp, sendExternalPluginRegistrationUpdates } from './followUp';
import {
  getExternalPluginId,
  initializeExternalPlugin,
  registerExternalPlugin,
  shouldDeferExternalPluginReadinessReplay,
  storeExternalPluginExtensionUri,
} from './state';

interface GraphViewPluginRegistry {
  register(plugin: IPlugin, options: { deferReadinessReplay: boolean }): void;
  initializePlugin(pluginId: string, workspaceRoot: string): PromiseLike<void>;
  replayReadinessForPlugin(pluginId: string): void;
}

interface GraphViewPluginAnalyzer {
  clearCache?(): void;
  registry: GraphViewPluginRegistry;
}

export interface GraphViewExternalPluginRegistrationOptions {
  extensionUri?: vscode.Uri | string;
}

export interface GraphViewExternalPluginRegistrationState {
  analyzer?: GraphViewPluginAnalyzer;
  pluginExtensionUris: Map<string, vscode.Uri>;
  firstAnalysis: boolean;
  readyNotified: boolean;
  analyzerInitialized: boolean;
  analyzerInitPromise?: Promise<void>;
}

export interface GraphViewExternalPluginRegistrationHandlers {
  normalizeExtensionUri(uri: vscode.Uri | string | undefined): vscode.Uri | undefined;
  getWorkspaceRoot(): string | undefined;
  refreshWebviewResourceRoots(): void;
  sendDepthState(): void;
  sendPluginStatuses(): void;
  sendContextMenuItems(): void;
  sendPluginExporters?(): void;
  sendPluginToolbarActions?(): void;
  sendPluginWebviewInjections(): void;
  invalidateTimelineCache?(): Promise<void>;
  analyzeAndSendData(): Promise<void>;
}

export function registerGraphViewExternalPlugin(
  plugin: unknown,
  options: GraphViewExternalPluginRegistrationOptions | undefined,
  state: GraphViewExternalPluginRegistrationState,
  handlers: GraphViewExternalPluginRegistrationHandlers,
): void {
  const pluginId = getExternalPluginId(plugin);
  if (!state.analyzer || !pluginId) {
    return;
  }

  const analyzer = state.analyzer;
  storeExternalPluginExtensionUri(pluginId, options, state, handlers);
  const shouldDeferReadinessReplay = shouldDeferExternalPluginReadinessReplay(state);
  registerExternalPlugin(plugin as IPlugin, shouldDeferReadinessReplay, state);
  analyzer.clearCache?.();
  sendExternalPluginRegistrationUpdates(handlers);
  void (async () => {
    try {
      await runExternalPluginRegistrationFollowUp(
        pluginId,
        shouldDeferReadinessReplay,
        state,
        handlers,
        initializeExternalPlugin,
      );
    } catch (error) {
      console.error(`[CodeGraphy] External plugin registration follow-up failed for ${pluginId}:`, error);
    }
  })();
}
