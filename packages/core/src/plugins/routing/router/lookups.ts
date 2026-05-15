import type { IPlugin } from '@codegraphy/plugin-api';
import { getFileExtension, normalizePluginExtension } from '../fileExtensions';

const WILDCARD_EXTENSION = '*';

/** Minimal plugin info subset needed for routing lookups. */
export interface IRoutablePluginInfo {
  plugin: IPlugin;
  options?: Record<string, unknown>;
}

function getPluginIdsForExtension(
  extension: string,
  extensionMap: Map<string, string[]>,
): string[] {
  return [
    ...(extensionMap.get(extension) ?? []),
    ...(extensionMap.get(WILDCARD_EXTENSION) ?? []),
  ];
}

/**
 * Gets the plugin that should handle a given file.
 * Returns the first registered plugin that supports the file's extension.
 */
export function getPluginForFile(
  filePath: string,
  plugins: Map<string, IRoutablePluginInfo>,
  extensionMap: Map<string, string[]>,
): IPlugin | undefined {
  const ext = getFileExtension(filePath);
  for (const pluginId of getPluginIdsForExtension(ext, extensionMap)) {
    const plugin = plugins.get(pluginId)?.plugin;
    if (plugin) {
      return plugin;
    }
  }

  return undefined;
}

/**
 * Gets all plugins that support a given file extension.
 */
export function getPluginsForExtension(
  extension: string,
  plugins: Map<string, IRoutablePluginInfo>,
  extensionMap: Map<string, string[]>,
): IPlugin[] {
  const normalizedExt = normalizePluginExtension(extension);
  const result: IPlugin[] = [];
  for (const pluginId of getPluginIdsForExtension(normalizedExt, extensionMap)) {
    const plugin = plugins.get(pluginId)?.plugin;
    if (plugin) {
      result.push(plugin);
    }
  }
  return result;
}

/**
 * Checks if any plugin supports a given file.
 */
export function supportsFile(
  filePath: string,
  extensionMap: Map<string, string[]>,
): boolean {
  const ext = getFileExtension(filePath);
  return extensionMap.has(ext) || extensionMap.has(WILDCARD_EXTENSION);
}

/**
 * Gets all supported file extensions across all plugins.
 */
export function getSupportedExtensions(
  extensionMap: Map<string, string[]>,
): string[] {
  return Array.from(extensionMap.keys());
}

export function getPluginsForFile(
  filePath: string,
  plugins: Map<string, IRoutablePluginInfo>,
  extensionMap: Map<string, string[]>,
): IPlugin[] {
  const ext = getFileExtension(filePath);
  return getPluginsForExtension(ext, plugins, extensionMap);
}

export function getPluginInfosForFile(
  filePath: string,
  plugins: Map<string, IRoutablePluginInfo>,
  extensionMap: Map<string, string[]>,
): IRoutablePluginInfo[] {
  const ext = getFileExtension(filePath);
  return getPluginIdsForExtension(ext, extensionMap)
    .map(pluginId => plugins.get(pluginId))
    .filter((pluginInfo): pluginInfo is IRoutablePluginInfo => pluginInfo !== undefined);
}
