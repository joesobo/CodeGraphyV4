/**
 * @fileoverview Plugin unregistration logic.
 * @module core/plugins/registry/unregister
 */

import type { IPluginInfoV2 } from '../state/store';
import type { EventBus } from '../../../events/bus';
import { removePluginFromExtensionMap } from '../maps/extensionMap';

/**
 * Remove a plugin from the registry, calling onUnload and cleaning up.
 */
export function removeFromRegistry(
  pluginId: string,
  plugins: Map<string, IPluginInfoV2>,
  extensionMap: Map<string, string[]>,
  initializedPlugins: Set<string>,
  eventBus?: EventBus,
): boolean {
  const info = plugins.get(pluginId);
  if (!info) return false;

  if (info.plugin.onUnload) {
    try {
      info.plugin.onUnload();
    } catch (error) {
      console.error(`[CodeGraphy] Error in onUnload for plugin ${pluginId}:`, error);
    }
  }

  info.api?.disposeAll();
  removePluginFromExtensionMap(pluginId, info.plugin, extensionMap);
  plugins.delete(pluginId);
  initializedPlugins.delete(pluginId);
  eventBus?.emit('plugin:unregistered', { pluginId });
  console.log(`[CodeGraphy] Unregistered plugin: ${pluginId}`);
  return true;
}
