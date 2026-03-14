import type { DecorationManager } from './DecorationManager';
import type { EventBus } from './EventBus';
import type { ViewRegistry } from '../views/ViewRegistry';
import type { CommandRegistrar, GraphDataProvider, WebviewMessageSender } from './CodeGraphyAPI';

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
