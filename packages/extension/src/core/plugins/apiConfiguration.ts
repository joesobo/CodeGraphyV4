import type { DecorationManager } from './decoration/manager';
import type { EventBus } from './eventBus';
import type { ViewRegistry } from '../views/registry';
import type { CommandRegistrar, GraphDataProvider, WebviewMessageSender } from './codeGraphyApi';

export interface IPluginApiConfiguration {
  eventBus?: EventBus;
  decorationManager?: DecorationManager;
  viewRegistry?: ViewRegistry;
  graphProvider?: GraphDataProvider;
  commandRegistrar?: CommandRegistrar;
  webviewSender?: WebviewMessageSender;
  workspaceRoot?: string;
}

export function hasScopedApiConfiguration(
  configuration: IPluginApiConfiguration
): configuration is Required<IPluginApiConfiguration> {
  return (
    configuration.eventBus !== undefined &&
    configuration.decorationManager !== undefined &&
    configuration.viewRegistry !== undefined &&
    configuration.graphProvider !== undefined &&
    configuration.commandRegistrar !== undefined &&
    configuration.webviewSender !== undefined &&
    configuration.workspaceRoot !== undefined
  );
}
