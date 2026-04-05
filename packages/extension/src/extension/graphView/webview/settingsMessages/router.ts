import type { IGraphData } from '../../../../shared/graph/types';
import type { ExtensionToWebviewMessage } from '../../../../shared/protocol/extensionToWebview';
import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';
import { applySettingsUpdateMessage } from './updates';
import { applySettingsDirectionMessage } from './direction';
import { applySettingsToggleMessage } from './toggle';

export interface GraphViewSettingsMessageState {
  activeViewId: string;
  disabledPlugins: Set<string>;
  disabledSources: Set<string>;
  filterPatterns: string[];
  graphData: IGraphData;
  viewContext: { folderNodeColor?: string };
}

export interface GraphViewSettingsMessageHandlers {
  getConfig<T>(key: string, defaultValue: T): T;
  updateConfig(key: string, value: unknown): Promise<void>;
  getPluginFilterPatterns(): string[];
  sendMessage(message: ExtensionToWebviewMessage): void;
  applyViewTransform(): void;
  smartRebuild(kind: 'rule' | 'plugin', id: string): void;
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
