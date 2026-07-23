/**
 * @fileoverview Plugin unregistration logic.
 * @module core/plugins/registry/unregister
 */

import type { IPluginInfoV2 } from '../state/store';
import { removePluginFromExtensionMap } from '../maps/extensionMap';

/**
 * Remove a plugin from the registry, calling onUnload and cleaning up.
 */
export function removeFromRegistry(
  pluginId: string,
  plugins: Map<string, IPluginInfoV2>,
  extensionMap: Map<string, string[]>,
  initializedPlugins: Set<IPluginInfoV2>,
): boolean {
  const info = plugins.get(pluginId);
  if (!info) return false;

  removePluginFromExtensionMap(pluginId, info.plugin, extensionMap);
  plugins.delete(pluginId);
  initializedPlugins.delete(info);
  if (shouldLogPluginLifecycle(info)) {
    console.log(`[CodeGraphy] Unregistered plugin: ${pluginId}`);
  }
  return true;
}

export function unloadPlugin(info: IPluginInfoV2): void {
  try {
    info.plugin.onUnload?.();
  } catch (error) {
    console.error(`[CodeGraphy] Error in onUnload for plugin ${info.plugin.id}:`, error);
  }
}

function shouldLogPluginLifecycle(info: IPluginInfoV2): boolean {
  return !info.builtIn || !!info.sourceExtension || !!info.sourcePackage;
}
