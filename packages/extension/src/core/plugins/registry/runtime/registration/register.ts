/**
 * @fileoverview Plugin registration logic for the registry.
 * @module core/plugins/registry/register
 */

import type { IPlugin } from '../../../types/contracts';
import type { IPluginInfoV2 } from '../state/store';
import { CORE_PLUGIN_API_VERSION } from '../../../versioning/apiVersions';
import { assertCoreApiCompatibility } from './compatibility';
import { addPluginToExtensionMap } from '../maps/extensionMap';

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
    sourceSignature?: string;
    options?: Record<string, unknown>;
  },
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
    ...(options.sourceSignature ? { sourceSignature: options.sourceSignature } : {}),
    ...(options.options ? { options: { ...options.options } } : {}),
  };

  return info;
}

/** Add a plugin to the registry maps. */
export function addToRegistry(
  info: IPluginInfoV2,
  plugins: Map<string, IPluginInfoV2>,
  extensionMap: Map<string, string[]>,
): void {
  plugins.set(info.plugin.id, info);
  addPluginToExtensionMap(info.plugin, extensionMap);
  if (shouldLogPluginLifecycle(info)) {
    console.log(`[CodeGraphy] Registered plugin: ${info.plugin.name} (${info.plugin.id})`);
  }
}

function shouldLogPluginLifecycle(info: IPluginInfoV2): boolean {
  return !info.builtIn || !!info.sourceExtension || !!info.sourcePackage;
}
