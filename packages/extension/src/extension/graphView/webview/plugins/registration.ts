import type * as vscode from 'vscode';
import type { IPlugin } from '../../../../core/plugins/types/contracts';

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
  sendPluginStatuses(): void;
  sendContextMenuItems(): void;
  sendPluginWebviewInjections(): void;
  analyzeAndSendData(): Promise<void>;
}

export function registerGraphViewExternalPlugin(
  plugin: unknown,
  options: GraphViewExternalPluginRegistrationOptions | undefined,
  state: GraphViewExternalPluginRegistrationState,
  handlers: GraphViewExternalPluginRegistrationHandlers,
): void {
  if (!state.analyzer || typeof plugin !== 'object' || plugin === null || !('id' in plugin)) {
    return;
  }

  const analyzer = state.analyzer;
  const pluginId = String((plugin as { id: unknown }).id);
  const sourceUri = handlers.normalizeExtensionUri(options?.extensionUri);
  if (sourceUri) {
    state.pluginExtensionUris.set(pluginId, sourceUri);
  }

  const shouldDeferReadinessReplay = !state.firstAnalysis || state.readyNotified;
  analyzer.registry.register(plugin as IPlugin, {
    deferReadinessReplay: shouldDeferReadinessReplay,
  });
  analyzer.clearCache?.();

  const initializePromise = (async () => {
    const workspaceRoot = handlers.getWorkspaceRoot();
    if (!workspaceRoot) return;

    if (state.analyzerInitPromise) {
      await state.analyzerInitPromise;
    }

    await analyzer.registry.initializePlugin(pluginId, workspaceRoot);
  })();

  handlers.refreshWebviewResourceRoots();
  handlers.sendPluginStatuses();
  handlers.sendContextMenuItems();
  handlers.sendPluginWebviewInjections();
  void initializePromise.finally(() => {
    if (shouldDeferReadinessReplay) {
      analyzer.registry.replayReadinessForPlugin(pluginId);
    }
    if (state.analyzerInitialized) {
      void handlers.analyzeAndSendData();
    }
  });
}
