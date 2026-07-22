/**
 * @fileoverview Plugin registration logic for the registry.
 * @module core/plugins/registry/register
 */

import type { IPlugin } from '../../../types/contracts';
import type { IPluginInfoV2 } from '../state/store';
import type { EventBus } from '../../../events/bus';
import type { DecorationManager } from '../../../decoration/manager';
import type { GraphDataProvider, CommandRegistrar, WebviewMessageSender, ExportSaver } from '../../../api/instance/runtime/access/context';
import type { ViewRegistry } from '../../../../views/registry';
import { CORE_PLUGIN_API_VERSION } from '../../../versioning/apiVersions';
import { hasScopedApiConfiguration } from '../../../api/instance/runtime/access/configuration';
import { assertCoreApiCompatibility } from './compatibility';
import { addPluginToExtensionMap } from '../maps/extensionMap';
import { createPluginApi } from './apiSetup';

export interface RegistryV2Config {
  eventBus?: EventBus;
  decorationManager?: DecorationManager;
  viewRegistry?: ViewRegistry;
  graphProvider?: GraphDataProvider;
  commandRegistrar?: CommandRegistrar;
  webviewSender?: WebviewMessageSender;
  exportSaver?: ExportSaver;
  workspaceRoot?: string;
  logFn: (level: string, ...args: unknown[]) => void;
}

/**
 * Validate and create a plugin info entry.
 */
export function validateAndCreatePluginInfo(
  plugin: IPlugin,
  options: {
    builtIn?: boolean;
    sourceExtension?: string;
    sourcePackage?: string;
    sourcePackageRoot?: string;
    descriptorSignature?: string;
    options?: Record<string, unknown>;
    interfaces?: Array<{ id: string; data: unknown }>;
  },
  config: RegistryV2Config,
): IPluginInfoV2 {
  const apiVersion = plugin.apiVersion;
  if (typeof apiVersion !== 'string') {
    throw new Error(
      `Plugin '${plugin.id}' must declare a string apiVersion (for example '^${CORE_PLUGIN_API_VERSION}').`
    );
  }

  assertCoreApiCompatibility(plugin.id, apiVersion);

  const info: IPluginInfoV2 = {
    plugin,
    builtIn: options.builtIn ?? false,
    ...(options.sourceExtension ? { sourceExtension: options.sourceExtension } : {}),
    ...(options.sourcePackage ? { sourcePackage: options.sourcePackage } : {}),
    ...(options.sourcePackageRoot ? { sourcePackageRoot: options.sourcePackageRoot } : {}),
    ...(options.descriptorSignature ? { descriptorSignature: options.descriptorSignature } : {}),
    ...(options.options ? { options: { ...options.options } } : {}),
    ...(options.interfaces ? { interfaces: [...options.interfaces] } : {}),
  };

  const apiConfiguration = {
    eventBus: config.eventBus,
    decorationManager: config.decorationManager,
    viewRegistry: config.viewRegistry,
    graphProvider: config.graphProvider,
    commandRegistrar: config.commandRegistrar,
    webviewSender: config.webviewSender,
    exportSaver: config.exportSaver,
    workspaceRoot: config.workspaceRoot,
  };
  if (hasScopedApiConfiguration(apiConfiguration)) {
    info.api = createPluginApi(plugin.id, apiConfiguration, config.logFn);
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
  if (shouldLogPluginLifecycle(info)) {
    console.log(`[CodeGraphy] Registered plugin: ${info.plugin.name} (${info.plugin.id})`);
  }
}

function shouldLogPluginLifecycle(info: IPluginInfoV2): boolean {
  return !info.builtIn || !!info.sourceExtension || !!info.sourcePackage;
}
