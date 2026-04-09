/**
 * @fileoverview Extension map management for the plugin registry.
 * @module core/plugins/registry/extensionMap
 */

import type { IPlugin } from '../types/contracts';
import { normalizePluginExtension } from '../routing/fileExtensions';

const WILDCARD_EXTENSION = '*';

/**
 * Add a plugin's supported extensions to the extension map.
 */
export function addPluginToExtensionMap(
  plugin: IPlugin,
  extensionMap: Map<string, string[]>,
): void {
  for (const ext of plugin.supportedExtensions) {
    if (ext === WILDCARD_EXTENSION) {
      const plugins = extensionMap.get(WILDCARD_EXTENSION) ?? [];
      plugins.push(plugin.id);
      extensionMap.set(WILDCARD_EXTENSION, plugins);
      continue;
    }

    const normalizedExt = normalizePluginExtension(ext);
    const plugins = extensionMap.get(normalizedExt) ?? [];
    plugins.push(plugin.id);
    extensionMap.set(normalizedExt, plugins);
  }
}

/**
 * Remove a plugin's supported extensions from the extension map.
 */
export function removePluginFromExtensionMap(
  pluginId: string,
  plugin: IPlugin,
  extensionMap: Map<string, string[]>,
): void {
  for (const ext of plugin.supportedExtensions) {
    if (ext === WILDCARD_EXTENSION) {
      const plugins = extensionMap.get(WILDCARD_EXTENSION);
      if (plugins) {
        const index = plugins.indexOf(pluginId);
        if (index !== -1) {
          plugins.splice(index, 1);
        }
        if (plugins.length === 0) {
          extensionMap.delete(WILDCARD_EXTENSION);
        }
      }
      continue;
    }

    const normalizedExt = normalizePluginExtension(ext);
    const plugins = extensionMap.get(normalizedExt);
    if (plugins) {
      const index = plugins.indexOf(pluginId);
      if (index !== -1) {
        plugins.splice(index, 1);
      }
      if (plugins.length === 0) {
        extensionMap.delete(normalizedExt);
      }
    }
  }
}

export function rebuildPluginExtensionMap(
  plugins: Iterable<IPlugin>,
  extensionMap: Map<string, string[]>,
): void {
  extensionMap.clear();

  for (const plugin of plugins) {
    addPluginToExtensionMap(plugin, extensionMap);
  }
}
