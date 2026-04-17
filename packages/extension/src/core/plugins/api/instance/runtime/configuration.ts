import type { ViewRegistry } from '../../../../views/registry';
import type { DecorationManager } from '../../../decoration/manager';
import type { EventBus } from '../../../events/bus';
import type {
  CommandRegistrar,
  ExportSaver,
  GraphDataProvider,
  WebviewMessageSender,
} from './context';

export interface IPluginApiConfiguration {
  eventBus?: EventBus;
  decorationManager?: DecorationManager;
  viewRegistry?: ViewRegistry;
  graphProvider?: GraphDataProvider;
  commandRegistrar?: CommandRegistrar;
  webviewSender?: WebviewMessageSender;
  exportSaver?: ExportSaver;
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
