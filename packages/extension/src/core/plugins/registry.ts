/**
 * @fileoverview Plugin registry for managing CodeGraphy plugins.
 * @module core/plugins/PluginRegistry
 */

import type { IPlugin, IPluginInfo, IConnection } from './types';
import type { EventBus } from './eventBus';
import type { CodeGraphyAPIImpl } from './codeGraphyApi';
import type { IGraphData } from '../../shared/contracts';
import { validateAndCreatePluginInfo, addToRegistry } from './registryRegister';
import type { RegistryV2Config } from './registryRegister';
import { removeFromRegistry } from './registryUnregister';
import { buildV2Config, DEFAULT_LOG_FN } from './registryConfigure';
import type { ConfigureV2Options } from './registryConfigure';
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
  api?: CodeGraphyAPIImpl;
}

export class PluginRegistry {
  private readonly _plugins = new Map<string, IPluginInfoV2>();
  private readonly _extensionMap = new Map<string, string[]>();
  private readonly _initializedPlugins = new Set<string>();
  private _eventBus?: EventBus;
  private _v2Config: RegistryV2Config = { logFn: DEFAULT_LOG_FN };
  private _lastWorkspaceReadyGraph?: IGraphData;
  private _workspaceReadyNotified = false;
  private _webviewReadyNotified = false;

  configureV2(options: ConfigureV2Options): void {
    this._eventBus = options.eventBus;
    this._v2Config = buildV2Config(options, this._v2Config.logFn);
  }

  register(
    plugin: IPlugin,
    options: { builtIn?: boolean; sourceExtension?: string; deferReadinessReplay?: boolean } = {},
  ): void {
    if (this._plugins.has(plugin.id)) {
      throw new Error(`Plugin with ID '${plugin.id}' is already registered`);
    }
    const info = validateAndCreatePluginInfo(plugin, options, this._v2Config);
    addToRegistry(info, this._plugins, this._extensionMap, this._eventBus);
    if (!options.deferReadinessReplay) {
      this._replayReadinessForPlugin(info);
    }
  }

  unregister(pluginId: string): boolean {
    return removeFromRegistry(pluginId, this._plugins, this._extensionMap, this._initializedPlugins, this._eventBus);
  }

  get(pluginId: string): IPluginInfo | undefined { return this._plugins.get(pluginId); }
  getPluginForFile(filePath: string): IPlugin | undefined { return getPluginForFile(filePath, this._plugins, this._extensionMap); }
  getPluginsForExtension(extension: string): IPlugin[] { return getPluginsForExtension(extension, this._plugins, this._extensionMap); }
  async analyzeFile(filePath: string, content: string, workspaceRoot: string): Promise<IConnection[]> { return analyzeFile(filePath, content, workspaceRoot, this._plugins, this._extensionMap); }
  list(): IPluginInfo[] { return Array.from(this._plugins.values()); }
  get size(): number { return this._plugins.size; }
  getSupportedExtensions(): string[] { return getSupportedExtensions(this._extensionMap); }
  supportsFile(filePath: string): boolean { return supportsFile(filePath, this._extensionMap); }

  async initializeAll(workspaceRoot: string): Promise<void> {
    this._v2Config.workspaceRoot = workspaceRoot;
    await lifecycleInitializeAll(this._plugins, workspaceRoot, this._initializedPlugins);
  }

  async initializePlugin(pluginId: string, workspaceRoot: string): Promise<void> {
    this._v2Config.workspaceRoot = workspaceRoot;
    const info = this._plugins.get(pluginId);
    if (!info) return;
    await lifecycleInitializePlugin(info, workspaceRoot, this._initializedPlugins);
  }

  disposeAll(): void { for (const [id] of this._plugins) this.unregister(id); }

  notifyWorkspaceReady(graph: IGraphData): void { this._workspaceReadyNotified = true; this._lastWorkspaceReadyGraph = graph; lifecycleNotifyWorkspaceReady(this._plugins, graph); }
  async notifyPreAnalyze(files: Array<{ absolutePath: string; relativePath: string; content: string }>, workspaceRoot: string): Promise<void> { await lifecycleNotifyPreAnalyze(this._plugins, files, workspaceRoot); }
  notifyPostAnalyze(graph: IGraphData): void { this._lastWorkspaceReadyGraph = graph; lifecycleNotifyPostAnalyze(this._plugins, graph); }
  notifyGraphRebuild(graph: IGraphData): void { this._lastWorkspaceReadyGraph = graph; lifecycleNotifyGraphRebuild(this._plugins, graph); }
  notifyWebviewReady(): void { this._webviewReadyNotified = true; lifecycleNotifyWebviewReady(this._plugins); }
  getPluginAPI(pluginId: string): CodeGraphyAPIImpl | undefined { return this._plugins.get(pluginId)?.api; }

  replayReadinessForPlugin(pluginId: string): void {
    const info = this._plugins.get(pluginId);
    if (!info) return;
    this._replayReadinessForPlugin(info);
  }

  private _replayReadinessForPlugin(info: IPluginInfoV2): void {
    lifecycleReplayReadiness(info, this._workspaceReadyNotified, this._lastWorkspaceReadyGraph, this._webviewReadyNotified);
  }
}
