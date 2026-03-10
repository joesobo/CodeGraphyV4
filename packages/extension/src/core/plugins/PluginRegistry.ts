/**
 * @fileoverview Plugin registry for managing CodeGraphy plugins.
 * Handles registration, lookup, and lifecycle of plugins.
 * @module core/plugins/PluginRegistry
 */

import { IPlugin, IPluginInfo, IConnection } from './types';
import { EventBus } from './EventBus';
import { DecorationManager } from './DecorationManager';
import { CodeGraphyAPIImpl, GraphDataProvider, CommandRegistrar, WebviewMessageSender } from './CodeGraphyAPI';
import { ViewRegistry } from '../views/ViewRegistry';
import { IGraphData } from '../../shared/types';

const CORE_PLUGIN_API_VERSION = '2.0.0';
const WEBVIEW_PLUGIN_API_VERSION = '1.0.0';

interface ISemver {
  major: number;
  minor: number;
  patch: number;
}

function parseSemver(input: string): ISemver | undefined {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(input.trim());
  if (!match) return undefined;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function compareSemver(a: ISemver, b: ISemver): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

function satisfiesSemverRange(version: string, range: string): boolean {
  const target = parseSemver(version);
  if (!target) return false;

  const normalized = range.trim();
  if (normalized.startsWith('^')) {
    const min = parseSemver(normalized.slice(1));
    if (!min) return false;
    const maxExclusive: ISemver = { major: min.major + 1, minor: 0, patch: 0 };
    return compareSemver(target, min) >= 0 && compareSemver(target, maxExclusive) < 0;
  }

  const exact = parseSemver(normalized);
  if (!exact) return false;
  return compareSemver(target, exact) === 0;
}

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
/** Extended plugin info that includes v2 API instance */
export interface IPluginInfoV2 extends IPluginInfo {
  /** Scoped API instance for v2 plugins */
  api?: CodeGraphyAPIImpl;
  /** Whether this is a v2 plugin (has apiVersion) */
  isV2: boolean;
}

export class PluginRegistry {
  /** Map of plugin ID to plugin info */
  private readonly _plugins = new Map<string, IPluginInfoV2>();

  /** Map of file extension to plugin IDs that support it */
  private readonly _extensionMap = new Map<string, string[]>();

  /** EventBus for v2 plugin event system */
  private _eventBus?: EventBus;

  /** DecorationManager for v2 plugin decorations */
  private _decorationManager?: DecorationManager;

  /** ViewRegistry for v2 plugin views */
  private _viewRegistry?: ViewRegistry;

  /** Graph data provider for v2 API */
  private _graphProvider?: GraphDataProvider;

  /** Command registrar for v2 API */
  private _commandRegistrar?: CommandRegistrar;

  /** Webview message sender for v2 API */
  private _webviewSender?: WebviewMessageSender;

  /** Workspace root for v2 API */
  private _workspaceRoot?: string;

  /** Log function for v2 API */
  private _logFn: (level: string, ...args: unknown[]) => void = (level, ...args) => {
    if (level === 'error') console.error(...args);
    else if (level === 'warn') console.warn(...args);
    else console.log(...args);
  };

  /**
   * Configure v2 subsystems. Must be called before registering v2 plugins.
   */
  configureV2(options: {
    eventBus: EventBus;
    decorationManager: DecorationManager;
    viewRegistry: ViewRegistry;
    graphProvider: GraphDataProvider;
    commandRegistrar: CommandRegistrar;
    webviewSender: WebviewMessageSender;
    workspaceRoot: string;
    logFn?: (level: string, ...args: unknown[]) => void;
  }): void {
    this._eventBus = options.eventBus;
    this._decorationManager = options.decorationManager;
    this._viewRegistry = options.viewRegistry;
    this._graphProvider = options.graphProvider;
    this._commandRegistrar = options.commandRegistrar;
    this._webviewSender = options.webviewSender;
    this._workspaceRoot = options.workspaceRoot;
    if (options.logFn) this._logFn = options.logFn;
  }

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

    // Detect v2 plugin by presence of apiVersion field
    const apiVersion = (plugin as unknown as { apiVersion?: unknown }).apiVersion;
    const isV2 = typeof apiVersion === 'string';
    if (isV2) {
      this._assertCoreApiCompatibility(plugin.id, apiVersion);
      this._warnOnWebviewApiMismatch(plugin);
    }

    const info: IPluginInfoV2 = {
      plugin,
      builtIn: options.builtIn ?? false,
      sourceExtension: options.sourceExtension,
      isV2,
    };

    // For v2 plugins, create a scoped API and call onLoad
    if (isV2 && this._eventBus && this._decorationManager && this._viewRegistry) {
      const api = new CodeGraphyAPIImpl(
        plugin.id,
        this._eventBus,
        this._decorationManager,
        this._viewRegistry,
        this._graphProvider ?? (() => ({ nodes: [], edges: [] })),
        this._commandRegistrar ?? (() => ({ dispose: () => {} })),
        this._webviewSender ?? (() => {}),
        this._workspaceRoot ?? '',
        this._logFn,
      );
      info.api = api;

      // Call onLoad lifecycle hook
      const v2Plugin = plugin as IPlugin & { onLoad?(api: CodeGraphyAPIImpl): void };
      if (v2Plugin.onLoad) {
        try {
          v2Plugin.onLoad(api);
        } catch (error) {
          console.error(`[CodeGraphy] Error in onLoad for plugin ${plugin.id}:`, error);
        }
      }
    }

    this._plugins.set(plugin.id, info);

    // Update extension map
    for (const ext of plugin.supportedExtensions) {
      const normalizedExt = ext.startsWith('.') ? ext : `.${ext}`;
      const plugins = this._extensionMap.get(normalizedExt) ?? [];
      plugins.push(plugin.id);
      this._extensionMap.set(normalizedExt, plugins);
    }

    // Emit plugin:registered event
    this._eventBus?.emit('plugin:registered', { pluginId: plugin.id });

    console.log(`[CodeGraphy] Registered plugin: ${plugin.name} (${plugin.id})`);
  }

  /**
   * Enforces compatibility between plugin apiVersion and host core API version.
   * Throws when incompatible.
   */
  private _assertCoreApiCompatibility(pluginId: string, range: string): void {
    if (satisfiesSemverRange(CORE_PLUGIN_API_VERSION, range)) {
      return;
    }

    const normalized = range.trim();
    const host = parseSemver(CORE_PLUGIN_API_VERSION);
    const base = normalized.startsWith('^')
      ? parseSemver(normalized.slice(1))
      : parseSemver(normalized);

    if (!host || !base) {
      throw new Error(
        `Plugin '${pluginId}' declares invalid apiVersion '${range}'. ` +
        `Use '^${CORE_PLUGIN_API_VERSION}' or an exact semver string.`
      );
    }

    if (base.major > host.major) {
      throw new Error(
        `Plugin '${pluginId}' requires future CodeGraphy Plugin API '${range}', ` +
        `but host provides '${CORE_PLUGIN_API_VERSION}'.`
      );
    }

    throw new Error(
      `Plugin '${pluginId}' targets unsupported CodeGraphy Plugin API '${range}'. ` +
      `Host provides '${CORE_PLUGIN_API_VERSION}'.`
    );
  }

  /**
   * Warns when a plugin declares Tier-2 webview contributions with an incompatible
   * webview API range. This is non-fatal to preserve forward compatibility.
   */
  private _warnOnWebviewApiMismatch(plugin: IPlugin): void {
    if (!plugin.webviewContributions || !plugin.webviewApiVersion) return;
    if (satisfiesSemverRange(WEBVIEW_PLUGIN_API_VERSION, plugin.webviewApiVersion)) return;

    console.warn(
      `[CodeGraphy] Plugin '${plugin.id}' declares incompatible webviewApiVersion ` +
      `'${plugin.webviewApiVersion}' (host: '${WEBVIEW_PLUGIN_API_VERSION}'). ` +
      `Webview contributions may not behave as expected.`
    );
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

    // For v2 plugins: call onUnload, then dispose the scoped API
    if (info.isV2 && info.api) {
      const v2Plugin = info.plugin as IPlugin & { onUnload?(): void };
      if (v2Plugin.onUnload) {
        try {
          v2Plugin.onUnload();
        } catch (error) {
          console.error(`[CodeGraphy] Error in onUnload for plugin ${pluginId}:`, error);
        }
      }
      info.api.disposeAll();
    }

    // Call dispose if available (v1 compatibility)
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

    // Emit plugin:unregistered event
    this._eventBus?.emit('plugin:unregistered', { pluginId });

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

  // ── v2 Lifecycle Notifications ──

  /**
   * Notify all v2 plugins that the workspace is ready with initial graph data.
   */
  notifyWorkspaceReady(graph: IGraphData): void {
    for (const info of this._plugins.values()) {
      if (!info.isV2) continue;
      const v2Plugin = info.plugin as IPlugin & { onWorkspaceReady?(graph: IGraphData): void };
      if (v2Plugin.onWorkspaceReady) {
        try {
          v2Plugin.onWorkspaceReady(graph);
        } catch (error) {
          console.error(`[CodeGraphy] Error in onWorkspaceReady for ${info.plugin.id}:`, error);
        }
      }
    }
  }

  /**
   * Notify all v2 plugins before an analysis pass.
   */
  async notifyPreAnalyze(
    files: Array<{ absolutePath: string; relativePath: string; content: string }>,
    workspaceRoot: string
  ): Promise<void> {
    for (const info of this._plugins.values()) {
      if (!info.isV2) continue;
      const v2Plugin = info.plugin as IPlugin & {
        onPreAnalyze?(files: Array<{ absolutePath: string; relativePath: string; content: string }>, workspaceRoot: string): Promise<void>;
      };
      if (v2Plugin.onPreAnalyze) {
        try {
          await v2Plugin.onPreAnalyze(files, workspaceRoot);
        } catch (error) {
          console.error(`[CodeGraphy] Error in onPreAnalyze for ${info.plugin.id}:`, error);
        }
      }
    }
  }

  /**
   * Notify all v2 plugins after an analysis pass.
   */
  notifyPostAnalyze(graph: IGraphData): void {
    for (const info of this._plugins.values()) {
      if (!info.isV2) continue;
      const v2Plugin = info.plugin as IPlugin & { onPostAnalyze?(graph: IGraphData): void };
      if (v2Plugin.onPostAnalyze) {
        try {
          v2Plugin.onPostAnalyze(graph);
        } catch (error) {
          console.error(`[CodeGraphy] Error in onPostAnalyze for ${info.plugin.id}:`, error);
        }
      }
    }
  }

  /**
   * Notify all v2 plugins that the graph was rebuilt without re-analysis.
   */
  notifyGraphRebuild(graph: IGraphData): void {
    for (const info of this._plugins.values()) {
      if (!info.isV2) continue;
      const v2Plugin = info.plugin as IPlugin & { onGraphRebuild?(graph: IGraphData): void };
      if (v2Plugin.onGraphRebuild) {
        try {
          v2Plugin.onGraphRebuild(graph);
        } catch (error) {
          console.error(`[CodeGraphy] Error in onGraphRebuild for ${info.plugin.id}:`, error);
        }
      }
    }
  }

  /**
   * Notify all v2 plugins that the webview is ready.
   */
  notifyWebviewReady(): void {
    for (const info of this._plugins.values()) {
      if (!info.isV2) continue;
      const v2Plugin = info.plugin as IPlugin & { onWebviewReady?(): void };
      if (v2Plugin.onWebviewReady) {
        try {
          v2Plugin.onWebviewReady();
        } catch (error) {
          console.error(`[CodeGraphy] Error in onWebviewReady for ${info.plugin.id}:`, error);
        }
      }
    }
  }

  /**
   * Get the scoped API for a v2 plugin (used by GraphViewProvider for message routing).
   */
  getPluginAPI(pluginId: string): CodeGraphyAPIImpl | undefined {
    return this._plugins.get(pluginId)?.api;
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
