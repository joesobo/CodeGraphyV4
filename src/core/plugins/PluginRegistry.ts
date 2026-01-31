/**
 * @fileoverview Plugin registry for managing CodeGraphy plugins.
 * Handles registration, lookup, and lifecycle of plugins.
 * @module core/plugins/PluginRegistry
 */

import { IPlugin, IPluginInfo, IConnection } from './types';

/**
 * Registry for managing CodeGraphy plugins.
 * 
 * The registry maintains a collection of plugins and provides methods
 * to register, unregister, and query plugins. It also handles routing
 * files to the appropriate plugin based on file extension.
 * 
 * @example
 * ```typescript
 * const registry = new PluginRegistry();
 * 
 * // Register a plugin
 * registry.register(typescriptPlugin, { builtIn: true });
 * 
 * // Get plugin for a file
 * const plugin = registry.getPluginForFile('src/app.ts');
 * 
 * // Analyze a file
 * const connections = await registry.analyzeFile(
 *   'src/app.ts',
 *   fileContent,
 *   workspaceRoot
 * );
 * ```
 */
export class PluginRegistry {
  /** Map of plugin ID to plugin info */
  private readonly _plugins = new Map<string, IPluginInfo>();
  
  /** Map of file extension to plugin IDs that support it */
  private readonly _extensionMap = new Map<string, string[]>();

  /**
   * Registers a plugin with the registry.
   * 
   * @param plugin - The plugin to register
   * @param options - Registration options
   * @throws Error if a plugin with the same ID is already registered
   */
  register(
    plugin: IPlugin,
    options: { builtIn?: boolean; sourceExtension?: string } = {}
  ): void {
    if (this._plugins.has(plugin.id)) {
      throw new Error(`Plugin with ID '${plugin.id}' is already registered`);
    }

    const info: IPluginInfo = {
      plugin,
      builtIn: options.builtIn ?? false,
      sourceExtension: options.sourceExtension,
    };

    this._plugins.set(plugin.id, info);

    // Update extension map
    for (const ext of plugin.supportedExtensions) {
      const normalizedExt = ext.startsWith('.') ? ext : `.${ext}`;
      const plugins = this._extensionMap.get(normalizedExt) ?? [];
      plugins.push(plugin.id);
      this._extensionMap.set(normalizedExt, plugins);
    }

    console.log(`[CodeGraphy] Registered plugin: ${plugin.name} (${plugin.id})`);
  }

  /**
   * Unregisters a plugin from the registry.
   * Calls the plugin's dispose method if available.
   * 
   * @param pluginId - ID of the plugin to unregister
   * @returns true if the plugin was found and removed, false otherwise
   */
  unregister(pluginId: string): boolean {
    const info = this._plugins.get(pluginId);
    if (!info) {
      return false;
    }

    // Call dispose if available
    if (info.plugin.dispose) {
      try {
        info.plugin.dispose();
      } catch (error) {
        console.error(`[CodeGraphy] Error disposing plugin ${pluginId}:`, error);
      }
    }

    // Remove from extension map
    for (const ext of info.plugin.supportedExtensions) {
      const normalizedExt = ext.startsWith('.') ? ext : `.${ext}`;
      const plugins = this._extensionMap.get(normalizedExt);
      if (plugins) {
        const index = plugins.indexOf(pluginId);
        if (index !== -1) {
          plugins.splice(index, 1);
        }
        if (plugins.length === 0) {
          this._extensionMap.delete(normalizedExt);
        }
      }
    }

    this._plugins.delete(pluginId);
    console.log(`[CodeGraphy] Unregistered plugin: ${pluginId}`);
    return true;
  }

  /**
   * Gets a plugin by its ID.
   * 
   * @param pluginId - ID of the plugin to get
   * @returns The plugin info, or undefined if not found
   */
  get(pluginId: string): IPluginInfo | undefined {
    return this._plugins.get(pluginId);
  }

  /**
   * Gets the plugin that should handle a given file.
   * Returns the first registered plugin that supports the file's extension.
   * 
   * @param filePath - Path to the file
   * @returns The plugin, or undefined if no plugin supports this file type
   */
  getPluginForFile(filePath: string): IPlugin | undefined {
    const ext = this._getExtension(filePath);
    const pluginIds = this._extensionMap.get(ext);
    
    if (!pluginIds || pluginIds.length === 0) {
      return undefined;
    }

    // Return the first plugin (built-in plugins should be registered first)
    const info = this._plugins.get(pluginIds[0]);
    return info?.plugin;
  }

  /**
   * Gets all plugins that support a given file extension.
   * 
   * @param extension - File extension (with or without leading dot)
   * @returns Array of plugins that support this extension
   */
  getPluginsForExtension(extension: string): IPlugin[] {
    const normalizedExt = extension.startsWith('.') ? extension : `.${extension}`;
    const pluginIds = this._extensionMap.get(normalizedExt) ?? [];
    
    return pluginIds
      .map((id) => this._plugins.get(id)?.plugin)
      .filter((p): p is IPlugin => p !== undefined);
  }

  /**
   * Analyzes a file using the appropriate plugin.
   * 
   * @param filePath - Absolute path to the file
   * @param content - File content
   * @param workspaceRoot - Workspace root path
   * @returns Array of detected connections, or empty array if no plugin supports this file
   */
  async analyzeFile(
    filePath: string,
    content: string,
    workspaceRoot: string
  ): Promise<IConnection[]> {
    const plugin = this.getPluginForFile(filePath);
    
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

  /**
   * Gets all registered plugins.
   * 
   * @returns Array of all plugin info objects
   */
  list(): IPluginInfo[] {
    return Array.from(this._plugins.values());
  }

  /**
   * Gets the count of registered plugins.
   */
  get size(): number {
    return this._plugins.size;
  }

  /**
   * Gets all supported file extensions across all plugins.
   * 
   * @returns Array of file extensions (with leading dot)
   */
  getSupportedExtensions(): string[] {
    return Array.from(this._extensionMap.keys());
  }

  /**
   * Checks if any plugin supports a given file.
   * 
   * @param filePath - Path to the file
   * @returns true if a plugin can handle this file
   */
  supportsFile(filePath: string): boolean {
    const ext = this._getExtension(filePath);
    return this._extensionMap.has(ext);
  }

  /**
   * Initializes all registered plugins.
   * 
   * @param workspaceRoot - Workspace root path
   */
  async initializeAll(workspaceRoot: string): Promise<void> {
    const promises = Array.from(this._plugins.values()).map(async (info) => {
      if (info.plugin.initialize) {
        try {
          await info.plugin.initialize(workspaceRoot);
        } catch (error) {
          console.error(
            `[CodeGraphy] Error initializing plugin ${info.plugin.id}:`,
            error
          );
        }
      }
    });

    await Promise.all(promises);
  }

  /**
   * Disposes all registered plugins and clears the registry.
   */
  disposeAll(): void {
    for (const [id] of this._plugins) {
      this.unregister(id);
    }
  }

  /**
   * Extracts the file extension from a path.
   */
  private _getExtension(filePath: string): string {
    const lastDot = filePath.lastIndexOf('.');
    if (lastDot === -1 || lastDot === filePath.length - 1) {
      return '';
    }
    return filePath.slice(lastDot).toLowerCase();
  }
}
