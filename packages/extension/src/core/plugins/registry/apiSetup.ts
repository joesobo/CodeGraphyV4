/**
 * @fileoverview Plugin API creation and onLoad invocation.
 * @module core/plugins/registry/apiSetup
 */

import type { IPlugin } from '../types/contracts';
import { CodeGraphyAPIImpl, GraphDataProvider, CommandRegistrar, WebviewMessageSender } from '../codeGraphyApi';
import type { EventBus } from '../eventBus';
import type { DecorationManager } from '../decoration/manager';
import type { ViewRegistry } from '../../views/registry';

export interface IApiDependencies {
  eventBus: EventBus;
  decorationManager: DecorationManager;
  viewRegistry: ViewRegistry;
  graphProvider: GraphDataProvider;
  commandRegistrar: CommandRegistrar;
  webviewSender: WebviewMessageSender;
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
