/**
 * @fileoverview Plugin API creation and onLoad invocation.
 * @module core/plugins/registry/apiSetup
 */

import type { IPlugin } from '../../../types/contracts';
import { CodeGraphyAPIImpl } from '../../../api/instance';
import type { GraphDataProvider, CommandRegistrar, WebviewMessageSender, ExportSaver } from '../../../api/instance/runtime/context';
import type { EventBus } from '../../../events/bus';
import type { DecorationManager } from '../../../decoration/manager';
import type { ViewRegistry } from '../../../../views/registry';

export interface IApiDependencies {
  eventBus: EventBus;
  decorationManager: DecorationManager;
  viewRegistry: ViewRegistry;
  graphProvider: GraphDataProvider;
  commandRegistrar: CommandRegistrar;
  webviewSender: WebviewMessageSender;
  exportSaver?: ExportSaver;
  workspaceRoot: string;
}

/**
 * Creates a scoped CodeGraphy API instance for a plugin.
 */
export function createPluginApi(
  pluginId: string,
  deps: IApiDependencies,
  logFn: (level: string, ...args: unknown[]) => void,
): CodeGraphyAPIImpl {
  return new CodeGraphyAPIImpl(
    pluginId,
    deps.eventBus,
    deps.decorationManager,
    deps.viewRegistry,
    deps.graphProvider,
    deps.commandRegistrar,
    deps.webviewSender,
    deps.exportSaver ?? (async () => undefined),
    deps.workspaceRoot,
    logFn,
  );
}

/**
 * Invokes a plugin's onLoad callback safely.
 */
export function callOnLoad(plugin: IPlugin, api: CodeGraphyAPIImpl): void {
  if (plugin.onLoad) {
    try {
      plugin.onLoad(api);
    } catch (error) {
      console.error(`[CodeGraphy] Error in onLoad for plugin ${plugin.id}:`, error);
    }
  }
}
