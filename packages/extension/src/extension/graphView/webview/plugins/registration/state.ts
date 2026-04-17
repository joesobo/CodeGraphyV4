import type { IPlugin } from '../../../../../core/plugins/types/contracts';
import type {
  GraphViewExternalPluginRegistrationHandlers,
  GraphViewExternalPluginRegistrationOptions,
  GraphViewExternalPluginRegistrationState,
} from './register';

export function getExternalPluginId(plugin: unknown): string | undefined {
  if (typeof plugin !== 'object' || plugin === null || !('id' in plugin)) {
    return undefined;
  }

  return String((plugin as { id: unknown }).id);
}

export function storeExternalPluginExtensionUri(
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

export function shouldDeferExternalPluginReadinessReplay(
  state: GraphViewExternalPluginRegistrationState,
): boolean {
  return !state.firstAnalysis || state.readyNotified;
}

export async function initializeExternalPlugin(
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

export function registerExternalPlugin(
  plugin: IPlugin,
  shouldDeferReadinessReplay: boolean,
  state: GraphViewExternalPluginRegistrationState,
): void {
  state.analyzer?.registry.register(plugin, {
    deferReadinessReplay: shouldDeferReadinessReplay,
  });
}
