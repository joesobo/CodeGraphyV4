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
  sendDepthState(): void;
  sendPluginStatuses(): void;
  sendContextMenuItems(): void;
  sendPluginExporters?(): void;
  sendPluginToolbarActions?(): void;
  sendPluginWebviewInjections(): void;
  invalidateTimelineCache?(): Promise<void>;
  analyzeAndSendData(): Promise<void>;
}

function getExternalPluginId(plugin: unknown): string | undefined {
  if (typeof plugin !== 'object' || plugin === null || !('id' in plugin)) {
    return undefined;
  }

  return String((plugin as { id: unknown }).id);
}

function storeExternalPluginExtensionUri(
  pluginId: string,
  options: GraphViewExternalPluginRegistrationOptions | undefined,
  state: GraphViewExternalPluginRegistrationState,
  handlers: GraphViewExternalPluginRegistrationHandlers,
): void {
  const sourceUri = handlers.normalizeExtensionUri(options?.extensionUri);
  if (sourceUri) {
    state.pluginExtensionUris.set(pluginId, sourceUri);
  }
}

function shouldDeferExternalPluginReadinessReplay(
  state: GraphViewExternalPluginRegistrationState,
): boolean {
  return !state.firstAnalysis || state.readyNotified;
}

async function initializeExternalPlugin(
  pluginId: string,
  state: GraphViewExternalPluginRegistrationState,
  handlers: GraphViewExternalPluginRegistrationHandlers,
): Promise<void> {
  const workspaceRoot = handlers.getWorkspaceRoot();
  if (!workspaceRoot) {
    return;
  }

  if (state.analyzerInitPromise) {
    await state.analyzerInitPromise;
  }

  await state.analyzer?.registry.initializePlugin(pluginId, workspaceRoot);
}

function sendExternalPluginRegistrationUpdates(
  handlers: GraphViewExternalPluginRegistrationHandlers,
): void {
  handlers.refreshWebviewResourceRoots();
  handlers.sendDepthState();
  handlers.sendPluginStatuses();
  handlers.sendContextMenuItems();
  handlers.sendPluginExporters?.();
  handlers.sendPluginToolbarActions?.();
  handlers.sendPluginWebviewInjections();
}

async function runExternalPluginRegistrationFollowUp(
  pluginId: string,
  shouldDeferReadinessReplay: boolean,
  state: GraphViewExternalPluginRegistrationState,
  handlers: GraphViewExternalPluginRegistrationHandlers,
): Promise<void> {
  await initializeExternalPlugin(pluginId, state, handlers);
  if (!shouldDeferReadinessReplay) {
    return;
  }

  state.analyzer?.registry.replayReadinessForPlugin(pluginId);
  await handlers.invalidateTimelineCache?.();
  if (state.analyzerInitialized) {
    await handlers.analyzeAndSendData();
  }
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
  analyzer.registry.register(plugin as IPlugin, {
    deferReadinessReplay: shouldDeferReadinessReplay,
  });
  analyzer.clearCache?.();
  sendExternalPluginRegistrationUpdates(handlers);
  void (async () => {
    try {
      await runExternalPluginRegistrationFollowUp(
        pluginId,
        shouldDeferReadinessReplay,
        state,
        handlers,
      );
    } catch (error) {
      console.error(`[CodeGraphy] External plugin registration follow-up failed for ${pluginId}:`, error);
    }
  })();
}
