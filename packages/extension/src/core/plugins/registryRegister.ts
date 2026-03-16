/**
 * @fileoverview Plugin registration logic for the registry.
 * @module core/plugins/registryRegister
 */

import type { IPlugin } from './types';
import type { IPluginInfoV2 } from './registry';
import type { EventBus } from './eventBus';
import type { DecorationManager } from './decorationManager';
import type { GraphDataProvider, CommandRegistrar, WebviewMessageSender } from './codeGraphyApi';
import type { ViewRegistry } from '../views/registry';
import { CORE_PLUGIN_API_VERSION } from './versioning';
import { hasScopedApiConfiguration } from './apiConfiguration';
import { assertCoreApiCompatibility, warnOnWebviewApiMismatch } from './registryCompatibility';
import { addPluginToExtensionMap } from './registryExtensionMap';
import { createPluginApi, callOnLoad } from './registryApiSetup';

export interface RegistryV2Config {
  eventBus?: EventBus;
  decorationManager?: DecorationManager;
  viewRegistry?: ViewRegistry;
  graphProvider?: GraphDataProvider;
  commandRegistrar?: CommandRegistrar;
  webviewSender?: WebviewMessageSender;
  workspaceRoot?: string;
  logFn: (level: string, ...args: unknown[]) => void;
}

/**
 * Validate and create a plugin info entry.
 */
export function validateAndCreatePluginInfo(
  plugin: IPlugin,
  options: { builtIn?: boolean; sourceExtension?: string },
  config: RegistryV2Config,
): IPluginInfoV2 {
  const apiVersion = plugin.apiVersion;
  if (typeof apiVersion !== 'string') {
    throw new Error(
      `Plugin '${plugin.id}' must declare a string apiVersion (for example '^${CORE_PLUGIN_API_VERSION}').`
    );
  }

  assertCoreApiCompatibility(plugin.id, apiVersion);
  warnOnWebviewApiMismatch(plugin);

  const info: IPluginInfoV2 = {
    plugin,
    builtIn: options.builtIn ?? false,
    sourceExtension: options.sourceExtension,
  };

  const apiConfiguration = {
    eventBus: config.eventBus,
    decorationManager: config.decorationManager,
    viewRegistry: config.viewRegistry,
    graphProvider: config.graphProvider,
    commandRegistrar: config.commandRegistrar,
    webviewSender: config.webviewSender,
    workspaceRoot: config.workspaceRoot,
  };
  if (hasScopedApiConfiguration(apiConfiguration)) {
    info.api = createPluginApi(plugin.id, apiConfiguration, config.logFn);
    callOnLoad(plugin, info.api);
  }

  return info;
}

/**
 * Add a plugin to the registry maps and emit registration event.
 */
export function addToRegistry(
  info: IPluginInfoV2,
  plugins: Map<string, IPluginInfoV2>,
  extensionMap: Map<string, string[]>,
  eventBus?: EventBus,
): void {
  plugins.set(info.plugin.id, info);
  addPluginToExtensionMap(info.plugin, extensionMap);
  eventBus?.emit('plugin:registered', { pluginId: info.plugin.id });
  console.log(`[CodeGraphy] Registered plugin: ${info.plugin.name} (${info.plugin.id})`);
}
