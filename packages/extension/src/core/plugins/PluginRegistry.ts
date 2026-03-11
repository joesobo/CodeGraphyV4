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
/** Extended plugin info that includes scoped plugin API instance. */
export interface IPluginInfoV2 extends IPluginInfo {
  /** Scoped API instance for the plugin (present when v2 subsystems are configured). */
  api?: CodeGraphyAPIImpl;
}

export class PluginRegistry {
  /** Map of plugin ID to plugin info */
  private readonly _plugins = new Map<string, IPluginInfoV2>();

  /** Map of file extension to plugin IDs that support it */
  private readonly _extensionMap = new Map<string, string[]>();

  /** EventBus for plugin event system */
  private _eventBus?: EventBus;

  /** DecorationManager for plugin decorations */
  private _decorationManager?: DecorationManager;

  /** ViewRegistry for plugin views */
  private _viewRegistry?: ViewRegistry;

  /** Graph data provider for plugin API */
  private _graphProvider?: GraphDataProvider;

  /** Command registrar for plugin API */
  private _commandRegistrar?: CommandRegistrar;

  /** Webview message sender for plugin API */
  private _webviewSender?: WebviewMessageSender;

  /** Workspace root for plugin API */
  private _workspaceRoot?: string;

  /** Log function for plugin API */
  private _logFn: (level: string, ...args: unknown[]) => void = (level, ...args) => {
    if (level === 'error') console.error(...args);
    else if (level === 'warn') console.warn(...args);
    else console.log(...args);
  };

  /** Last graph sent through workspace-ready lifecycle (for late-registration replay). */
  private _lastWorkspaceReadyGraph?: IGraphData;

  /** Whether workspace-ready lifecycle has fired at least once. */
  private _workspaceReadyNotified = false;

  /** Whether webview-ready lifecycle has fired at least once. */
  private _webviewReadyNotified = false;

  /** Tracks plugins that have already run initialize(). */
  private readonly _initializedPlugins = new Set<string>();

  /**
   * Configure plugin API subsystems.
   * Call this before registering plugins to enable scoped API provisioning.
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
    options: {
      builtIn?: boolean;
      sourceExtension?: string;
      /** If true, caller manually triggers late-readiness replay via replayReadinessForPlugin(). */
      deferReadinessReplay?: boolean;
    } = {}
  ): void {
    if (this._plugins.has(plugin.id)) {
      throw new Error(`Plugin with ID '${plugin.id}' is already registered`);
    }

    const apiVersion = plugin.apiVersion;
    if (typeof apiVersion !== 'string') {
      throw new Error(
        `Plugin '${plugin.id}' must declare a string apiVersion (for example '^${CORE_PLUGIN_API_VERSION}').`
      );
    }

    this._assertCoreApiCompatibility(plugin.id, apiVersion);
    this._warnOnWebviewApiMismatch(plugin);

    const info: IPluginInfoV2 = {
      plugin,
      builtIn: options.builtIn ?? false,
      sourceExtension: options.sourceExtension,
    };

    if (
      this._eventBus &&
      this._decorationManager &&
      this._viewRegistry &&
      this._graphProvider &&
      this._commandRegistrar &&
      this._webviewSender &&
      this._workspaceRoot !== undefined
    ) {
      const api = new CodeGraphyAPIImpl(
        plugin.id,
        this._eventBus,
        this._decorationManager,
        this._viewRegistry,
        this._graphProvider,
        this._commandRegistrar,
        this._webviewSender,
        this._workspaceRoot,
        this._logFn,
      );
      info.api = api;

      if (plugin.onLoad) {
        try {
          plugin.onLoad(api);
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

    // Replay readiness hooks for plugins registered after initial readiness.
    // Some call sites intentionally defer this to control ordering
    // (for example: initialize -> inject webview assets -> replay).
    if (!options.deferReadinessReplay) {
      this._replayReadinessForPlugin(info);
    }

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

    if (info.plugin.onUnload) {
      try {
        info.plugin.onUnload();
      } catch (error) {
        console.error(`[CodeGraphy] Error in onUnload for plugin ${pluginId}:`, error);
      }
    }

    info.api?.disposeAll();

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
    this._initializedPlugins.delete(pluginId);

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
    this._workspaceRoot = workspaceRoot;
    const promises = Array.from(this._plugins.values()).map((info) =>
      this._initializePlugin(info, workspaceRoot)
    );

    await Promise.all(promises);
  }

  /**
   * Initializes one registered plugin if it has not already been initialized.
   * Useful for plugins registered after startup.
   */
  async initializePlugin(pluginId: string, workspaceRoot: string): Promise<void> {
    this._workspaceRoot = workspaceRoot;
    const info = this._plugins.get(pluginId);
    if (!info) return;
    await this._initializePlugin(info, workspaceRoot);
  }

  /**
   * Disposes all registered plugins and clears the registry.
   */
  disposeAll(): void {
    for (const [id] of this._plugins) {
      this.unregister(id);
    }
  }

  // ── Lifecycle Notifications ──

  /**
   * Notify all plugins that the workspace is ready with initial graph data.
   */
  notifyWorkspaceReady(graph: IGraphData): void {
    this._workspaceReadyNotified = true;
    this._lastWorkspaceReadyGraph = graph;
    for (const info of this._plugins.values()) {
      this._notifyWorkspaceReadyForPlugin(info, graph);
    }
  }

  /**
   * Notify all plugins before an analysis pass.
   */
  async notifyPreAnalyze(
    files: Array<{ absolutePath: string; relativePath: string; content: string }>,
    workspaceRoot: string
  ): Promise<void> {
    for (const info of this._plugins.values()) {
      if (info.plugin.onPreAnalyze) {
        try {
          await info.plugin.onPreAnalyze(files, workspaceRoot);
        } catch (error) {
          console.error(`[CodeGraphy] Error in onPreAnalyze for ${info.plugin.id}:`, error);
        }
      }
    }
  }

  /**
   * Notify all plugins after an analysis pass.
   */
  notifyPostAnalyze(graph: IGraphData): void {
    this._lastWorkspaceReadyGraph = graph;
    for (const info of this._plugins.values()) {
      if (info.plugin.onPostAnalyze) {
        try {
          info.plugin.onPostAnalyze(graph);
        } catch (error) {
          console.error(`[CodeGraphy] Error in onPostAnalyze for ${info.plugin.id}:`, error);
        }
      }
    }
  }

  /**
   * Notify all plugins that the graph was rebuilt without re-analysis.
   */
  notifyGraphRebuild(graph: IGraphData): void {
    this._lastWorkspaceReadyGraph = graph;
    for (const info of this._plugins.values()) {
      if (info.plugin.onGraphRebuild) {
        try {
          info.plugin.onGraphRebuild(graph);
        } catch (error) {
          console.error(`[CodeGraphy] Error in onGraphRebuild for ${info.plugin.id}:`, error);
        }
      }
    }
  }

  /**
   * Notify all plugins that the webview is ready.
   */
  notifyWebviewReady(): void {
    this._webviewReadyNotified = true;
    for (const info of this._plugins.values()) {
      this._notifyWebviewReadyForPlugin(info);
    }
  }

  /**
   * Get the scoped API for a plugin (used by GraphViewProvider for message routing).
   */
  getPluginAPI(pluginId: string): CodeGraphyAPIImpl | undefined {
    return this._plugins.get(pluginId)?.api;
  }

  /**
   * Replays readiness hooks for one already-registered plugin.
   * Used when a caller needs explicit ordering around late registration.
   */
  replayReadinessForPlugin(pluginId: string): void {
    const info = this._plugins.get(pluginId);
    if (!info) return;
    this._replayReadinessForPlugin(info);
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

  /**
   * Runs initialize() once per plugin.
   */
  private async _initializePlugin(info: IPluginInfoV2, workspaceRoot: string): Promise<void> {
    const pluginId = info.plugin.id;
    if (this._initializedPlugins.has(pluginId)) return;
    this._initializedPlugins.add(pluginId);

    if (!info.plugin.initialize) {
      return;
    }

    try {
      await info.plugin.initialize(workspaceRoot);
    } catch (error) {
      this._initializedPlugins.delete(pluginId);
      console.error(
        `[CodeGraphy] Error initializing plugin ${pluginId}:`,
        error
      );
    }
  }

  /**
   * Replays readiness hooks for a late-registered plugin, similar to Obsidian's
   * "run now if already ready" behavior.
   */
  private _replayReadinessForPlugin(info: IPluginInfoV2): void {
    if (this._workspaceReadyNotified && this._lastWorkspaceReadyGraph) {
      this._notifyWorkspaceReadyForPlugin(info, this._lastWorkspaceReadyGraph);
    }
    if (this._webviewReadyNotified) {
      this._notifyWebviewReadyForPlugin(info);
    }
  }

  /**
   * Safely invokes onWorkspaceReady for one plugin.
   */
  private _notifyWorkspaceReadyForPlugin(info: IPluginInfoV2, graph: IGraphData): void {
    if (!info.plugin.onWorkspaceReady) return;
    try {
      info.plugin.onWorkspaceReady(graph);
    } catch (error) {
      console.error(`[CodeGraphy] Error in onWorkspaceReady for ${info.plugin.id}:`, error);
    }
  }

  /**
   * Safely invokes onWebviewReady for one plugin.
   */
  private _notifyWebviewReadyForPlugin(info: IPluginInfoV2): void {
    if (!info.plugin.onWebviewReady) return;
    try {
      info.plugin.onWebviewReady();
    } catch (error) {
      console.error(`[CodeGraphy] Error in onWebviewReady for ${info.plugin.id}:`, error);
    }
  }
}
