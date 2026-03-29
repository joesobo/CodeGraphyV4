/**
 * @fileoverview Pure file-routing functions for the plugin registry.
 * Determines which plugin handles a given file based on extension maps.
 * @module core/plugins/routing/router
 */

import { IPlugin, IConnection } from '../types/contracts';
import { getFileExtension, normalizePluginExtension } from './fileExtensions';

/** Minimal plugin info subset needed for routing lookups. */
export interface IRoutablePluginInfo {
  plugin: IPlugin;
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
  const pluginIds = extensionMap.get(ext);

  if (!pluginIds || pluginIds.length === 0) {
    return undefined;
  }

  for (const pluginId of pluginIds) {
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
  const pluginIds = extensionMap.get(normalizedExt);
  if (!pluginIds) {
    return [];
  }

  const result: IPlugin[] = [];
  for (const pluginId of pluginIds) {
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
  return extensionMap.has(ext);
}

/**
 * Gets all supported file extensions across all plugins.
 */
export function getSupportedExtensions(
  extensionMap: Map<string, string[]>,
): string[] {
  return Array.from(extensionMap.keys());
}

/**
 * Analyzes a file using the appropriate plugin.
 */
export async function analyzeFile(
  filePath: string,
  content: string,
  workspaceRoot: string,
  plugins: Map<string, IRoutablePluginInfo>,
  extensionMap: Map<string, string[]>,
): Promise<IConnection[]> {
  const plugin = getPluginForFile(filePath, plugins, extensionMap);

  if (!plugin) {
    return [];
  }

  try {
    return await plugin.detectConnections(filePath, content, workspaceRoot);
  } catch (error) {
    console.error(`[CodeGraphy] Error analyzing ${filePath} with ${plugin.id}:`, error);
    return [];
  }
}
