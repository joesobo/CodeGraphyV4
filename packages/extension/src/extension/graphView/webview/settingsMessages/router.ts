import type { ExtensionToWebviewMessage } from '../../../../shared/protocol/extensionToWebview';
import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';
import { applySettingsUpdateMessage } from './updates/apply';
import { applySettingsDirectionMessage } from './direction';
import { applySettingsToggleMessage } from './toggle';

export interface GraphViewSettingsMessageState {
  disabledPlugins: Set<string>;
  filterPatterns: string[];
}

export interface GraphViewSettingsMessageHandlers {
  getConfig<T>(key: string, defaultValue: T): T;
  updateConfig(key: string, value: unknown): Promise<void>;
  smartRebuild(id: string): void;
  sendGraphControls(): void;
  reprocessPluginFiles(pluginIds: readonly string[]): Promise<void>;
  getPluginFilterPatterns(): string[];
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

  return applySettingsToggleMessage(message, state, handlers);
}
