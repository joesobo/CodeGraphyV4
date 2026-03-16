/**
 * @fileoverview Plugin registry for managing CodeGraphy plugins.
 * @module core/plugins/PluginRegistry
 */

import { IPlugin, IPluginInfo, IConnection } from './types';
import { EventBus } from './eventBus';
import { DecorationManager } from './decorationManager';
import { CodeGraphyAPIImpl, GraphDataProvider, CommandRegistrar, WebviewMessageSender } from './codeGraphyApi';
import { ViewRegistry } from '../views/registry';
import { IGraphData } from '../../shared/types';
import { CORE_PLUGIN_API_VERSION } from './versioning';
import { hasScopedApiConfiguration } from './apiConfiguration';
import { assertCoreApiCompatibility, warnOnWebviewApiMismatch } from './registryCompatibility';
import { addPluginToExtensionMap, removePluginFromExtensionMap } from './registryExtensionMap';
import { createPluginApi, callOnLoad } from './registryApiSetup';
import {
  getPluginForFile,
  getPluginsForExtension,
  supportsFile,
  getSupportedExtensions,
  analyzeFile,
} from './pluginRouting';
import {
  initializeAll as lifecycleInitializeAll,
  initializePlugin as lifecycleInitializePlugin,
  notifyWorkspaceReady as lifecycleNotifyWorkspaceReady,
  notifyPreAnalyze as lifecycleNotifyPreAnalyze,
  notifyPostAnalyze as lifecycleNotifyPostAnalyze,
  notifyGraphRebuild as lifecycleNotifyGraphRebuild,
  notifyWebviewReady as lifecycleNotifyWebviewReady,
  replayReadinessForPlugin as lifecycleReplayReadiness,
} from './pluginLifecycle';

/** Extended plugin info that includes scoped plugin API instance. */
export interface IPluginInfoV2 extends IPluginInfo {
  /** Scoped API instance for the plugin (present when v2 subsystems are configured). */
  api?: CodeGraphyAPIImpl;
}

export class PluginRegistry {
  private readonly _plugins = new Map<string, IPluginInfoV2>();
  private readonly _extensionMap = new Map<string, string[]>();
  private _eventBus?: EventBus;
  private _decorationManager?: DecorationManager;
  private _viewRegistry?: ViewRegistry;
  private _graphProvider?: GraphDataProvider;
  private _commandRegistrar?: CommandRegistrar;
  private _webviewSender?: WebviewMessageSender;
  private _workspaceRoot?: string;
  private _logFn: (level: string, ...args: unknown[]) => void = (level, ...args) => {
    if (level === 'error') console.error(...args);
    else if (level === 'warn') console.warn(...args);
    else console.log(...args);
  };
  private _lastWorkspaceReadyGraph?: IGraphData;
  private _workspaceReadyNotified = false;
  private _webviewReadyNotified = false;
  private readonly _initializedPlugins = new Set<string>();

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

  register(
    plugin: IPlugin,
    options: {
      builtIn?: boolean;
      sourceExtension?: string;
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

    assertCoreApiCompatibility(plugin.id, apiVersion);
    warnOnWebviewApiMismatch(plugin);

    const info: IPluginInfoV2 = {
      plugin,
      builtIn: options.builtIn ?? false,
      sourceExtension: options.sourceExtension,
    };

    const apiConfiguration = {
      eventBus: this._eventBus,
      decorationManager: this._decorationManager,
      viewRegistry: this._viewRegistry,
      graphProvider: this._graphProvider,
      commandRegistrar: this._commandRegistrar,
      webviewSender: this._webviewSender,
      workspaceRoot: this._workspaceRoot,
    };
    if (hasScopedApiConfiguration(apiConfiguration)) {
      info.api = createPluginApi(plugin.id, apiConfiguration, this._logFn);
      callOnLoad(plugin, info.api);
    }

    this._plugins.set(plugin.id, info);
    addPluginToExtensionMap(plugin, this._extensionMap);
    this._eventBus?.emit('plugin:registered', { pluginId: plugin.id });

    if (!options.deferReadinessReplay) {
      this._replayReadinessForPlugin(info);
    }

    console.log(`[CodeGraphy] Registered plugin: ${plugin.name} (${plugin.id})`);
  }

  unregister(pluginId: string): boolean {
    const info = this._plugins.get(pluginId);
    if (!info) return false;

    if (info.plugin.onUnload) {
      try {
        info.plugin.onUnload();
      } catch (error) {
        console.error(`[CodeGraphy] Error in onUnload for plugin ${pluginId}:`, error);
      }
    }

    info.api?.disposeAll();
    removePluginFromExtensionMap(pluginId, info.plugin, this._extensionMap);
    this._plugins.delete(pluginId);
    this._initializedPlugins.delete(pluginId);
    this._eventBus?.emit('plugin:unregistered', { pluginId });
    console.log(`[CodeGraphy] Unregistered plugin: ${pluginId}`);
    return true;
  }

  get(pluginId: string): IPluginInfo | undefined {
    return this._plugins.get(pluginId);
  }

  getPluginForFile(filePath: string): IPlugin | undefined {
    return getPluginForFile(filePath, this._plugins, this._extensionMap);
  }

  getPluginsForExtension(extension: string): IPlugin[] {
    return getPluginsForExtension(extension, this._plugins, this._extensionMap);
  }

  async analyzeFile(filePath: string, content: string, workspaceRoot: string): Promise<IConnection[]> {
    return analyzeFile(filePath, content, workspaceRoot, this._plugins, this._extensionMap);
  }

  list(): IPluginInfo[] {
    return Array.from(this._plugins.values());
  }

  get size(): number {
    return this._plugins.size;
  }

  getSupportedExtensions(): string[] {
    return getSupportedExtensions(this._extensionMap);
  }

  supportsFile(filePath: string): boolean {
    return supportsFile(filePath, this._extensionMap);
  }

  async initializeAll(workspaceRoot: string): Promise<void> {
    this._workspaceRoot = workspaceRoot;
    await lifecycleInitializeAll(this._plugins, workspaceRoot, this._initializedPlugins);
  }

  async initializePlugin(pluginId: string, workspaceRoot: string): Promise<void> {
    this._workspaceRoot = workspaceRoot;
    const info = this._plugins.get(pluginId);
    if (!info) return;
    await lifecycleInitializePlugin(info, workspaceRoot, this._initializedPlugins);
  }

  disposeAll(): void {
    for (const [id] of this._plugins) {
      this.unregister(id);
    }
  }

  notifyWorkspaceReady(graph: IGraphData): void {
    this._workspaceReadyNotified = true;
    this._lastWorkspaceReadyGraph = graph;
    lifecycleNotifyWorkspaceReady(this._plugins, graph);
  }

  async notifyPreAnalyze(
    files: Array<{ absolutePath: string; relativePath: string; content: string }>,
    workspaceRoot: string
  ): Promise<void> {
    await lifecycleNotifyPreAnalyze(this._plugins, files, workspaceRoot);
  }

  notifyPostAnalyze(graph: IGraphData): void {
    this._lastWorkspaceReadyGraph = graph;
    lifecycleNotifyPostAnalyze(this._plugins, graph);
  }

  notifyGraphRebuild(graph: IGraphData): void {
    this._lastWorkspaceReadyGraph = graph;
    lifecycleNotifyGraphRebuild(this._plugins, graph);
  }

  notifyWebviewReady(): void {
    this._webviewReadyNotified = true;
    lifecycleNotifyWebviewReady(this._plugins);
  }

  getPluginAPI(pluginId: string): CodeGraphyAPIImpl | undefined {
    return this._plugins.get(pluginId)?.api;
  }

  replayReadinessForPlugin(pluginId: string): void {
    const info = this._plugins.get(pluginId);
    if (!info) return;
    this._replayReadinessForPlugin(info);
  }

  private _replayReadinessForPlugin(info: IPluginInfoV2): void {
    lifecycleReplayReadiness(
      info,
      this._workspaceReadyNotified,
      this._lastWorkspaceReadyGraph,
      this._webviewReadyNotified,
    );
  }
}
