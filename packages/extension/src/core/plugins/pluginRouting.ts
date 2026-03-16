/**
 * @fileoverview Pure functions for routing files to the appropriate plugin.
 * These functions are stateless and receive the plugins map as a parameter.
 * @module core/plugins/pluginRouting
 */

import { IPlugin, IConnection, IPluginInfo } from './types';
import { CodeGraphyAPIImpl } from './CodeGraphyAPI';

/** Minimal shape of a plugin info record that routing functions require. */
export interface IPluginInfoWithApi extends IPluginInfo {
  api?: CodeGraphyAPIImpl;
}

/**
 * Extracts the file extension from a path (lowercase, with leading dot).
 * Returns '' if there is no extension.
 */
export function getExtension(filePath: string): string {
  const lastDot = filePath.lastIndexOf('.');
  if (lastDot === -1 || lastDot === filePath.length - 1) {
    return '';
  }
  return filePath.slice(lastDot).toLowerCase();
}

/**
 * Gets the plugin that should handle a given file.
 * Returns the first registered plugin that supports the file's extension.
 *
 * @param filePath - Path to the file
 * @param plugins - The plugins map
 * @param extensionMap - The extension-to-plugin-ID map
 * @returns The plugin, or undefined if no plugin supports this file type
 */
export function getPluginForFile(
  filePath: string,
  plugins: ReadonlyMap<string, IPluginInfoWithApi>,
  extensionMap: ReadonlyMap<string, string[]>
): IPlugin | undefined {
  const ext = getExtension(filePath);
  const pluginIds = extensionMap.get(ext);

  if (!pluginIds || pluginIds.length === 0) {
    return undefined;
  }

  const info = plugins.get(pluginIds[0]);
  return info?.plugin;
}

/**
 * Gets all plugins that support a given file extension.
 *
 * @param extension - File extension (with or without leading dot)
 * @param plugins - The plugins map
 * @param extensionMap - The extension-to-plugin-ID map
 * @returns Array of plugins that support this extension
 */
export function getPluginsForExtension(
  extension: string,
  plugins: ReadonlyMap<string, IPluginInfoWithApi>,
  extensionMap: ReadonlyMap<string, string[]>
): IPlugin[] {
  const normalizedExt = extension.startsWith('.') ? extension : `.${extension}`;
  const pluginIds = extensionMap.get(normalizedExt) ?? [];

  return pluginIds
    .map((id) => plugins.get(id)?.plugin)
    .filter((plugin): plugin is IPlugin => plugin !== undefined);
}

/**
 * Checks if any plugin supports a given file.
 *
 * @param filePath - Path to the file
 * @param extensionMap - The extension-to-plugin-ID map
 * @returns true if a plugin can handle this file
 */
export function supportsFile(
  filePath: string,
  extensionMap: ReadonlyMap<string, string[]>
): boolean {
  const ext = getExtension(filePath);
  return extensionMap.has(ext);
}

/**
 * Gets all supported file extensions across all plugins.
 *
 * @param extensionMap - The extension-to-plugin-ID map
 * @returns Array of file extensions (with leading dot)
 */
export function getSupportedExtensions(
  extensionMap: ReadonlyMap<string, string[]>
): string[] {
  return Array.from(extensionMap.keys());
}

/**
 * Analyzes a file using the appropriate plugin.
 *
 * @param filePath - Absolute path to the file
 * @param content - File content
 * @param workspaceRoot - Workspace root path
 * @param plugins - The plugins map
 * @param extensionMap - The extension-to-plugin-ID map
 * @returns Array of detected connections, or empty array if no plugin supports this file
 */
export async function analyzeFile(
  filePath: string,
  content: string,
  workspaceRoot: string,
  plugins: ReadonlyMap<string, IPluginInfoWithApi>,
  extensionMap: ReadonlyMap<string, string[]>
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
