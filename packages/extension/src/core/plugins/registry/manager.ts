/**
 * @fileoverview Plugin registry for managing CodeGraphy plugins.
 * @module core/plugins/registry/manager
 */

import type {
  IPlugin,
  IPluginInfo,
  IConnection,
  IFileAnalysisResult,
  IPluginEdgeType,
  IPluginNodeType,
} from '../types/contracts';
import type { EventBus } from '../events/bus';
import type { CodeGraphyAPIImpl } from '../api/instance';
import type { IGraphData } from '../../../shared/graph/types';
import { validateAndCreatePluginInfo, addToRegistry } from './register';
import type { RegistryV2Config } from './register';
import { removeFromRegistry } from './unregister';
import { buildV2Config, DEFAULT_LOG_FN } from './configure';
import type { ConfigureV2Options } from './configure';
import { rebuildPluginExtensionMap } from './extensionMap';
import {
  getPluginForFile,
  getPluginsForExtension,
  supportsFile,
  getSupportedExtensions,
  analyzeFile,
  analyzeFileResult,
} from '../routing/router';
import {
  initializeAll as lifecycleInitializeAll,
  initializePlugin as lifecycleInitializePlugin,
} from '../lifecycle/initialize';
import {
  notifyWorkspaceReady as lifecycleNotifyWorkspaceReady,
  notifyPreAnalyze as lifecycleNotifyPreAnalyze,
  notifyPostAnalyze as lifecycleNotifyPostAnalyze,
  notifyGraphRebuild as lifecycleNotifyGraphRebuild,
  notifyWebviewReady as lifecycleNotifyWebviewReady,
} from '../lifecycle/notify';
import { replayReadinessForPlugin as lifecycleReplayReadiness } from '../lifecycle/replay';

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
  async analyzeFileResult(filePath: string, content: string, workspaceRoot: string): Promise<IFileAnalysisResult | null> { return analyzeFileResult(filePath, content, workspaceRoot, this._plugins, this._extensionMap); }
  list(): IPluginInfo[] { return Array.from(this._plugins.values()); }
  listNodeTypes(): IPluginNodeType[] { return listPluginContributions(this._plugins, plugin => plugin.contributeNodeTypes?.() ?? [], definition => definition.id); }
  listEdgeTypes(): IPluginEdgeType[] { return listPluginContributions(this._plugins, plugin => plugin.contributeEdgeTypes?.() ?? [], definition => definition.id); }
  get size(): number { return this._plugins.size; }
  getSupportedExtensions(): string[] { return getSupportedExtensions(this._extensionMap); }
  supportsFile(filePath: string): boolean { return supportsFile(filePath, this._extensionMap); }
  setPluginOrder(pluginIds: string[]): void {
    if (pluginIds.length === 0 || this._plugins.size <= 1) {
      return;
    }

    const orderedIds = new Set<string>();
    const reorderedPlugins = new Map<string, IPluginInfoV2>();

    for (const pluginId of pluginIds) {
      const info = this._plugins.get(pluginId);
      if (!info || orderedIds.has(pluginId)) {
        continue;
      }

      orderedIds.add(pluginId);
      reorderedPlugins.set(pluginId, info);
    }

    for (const [pluginId, info] of this._plugins) {
      if (orderedIds.has(pluginId)) {
        continue;
      }

      reorderedPlugins.set(pluginId, info);
    }

    this._plugins.clear();
    for (const [pluginId, info] of reorderedPlugins) {
      this._plugins.set(pluginId, info);
    }

    rebuildPluginExtensionMap(
      Array.from(this._plugins.values(), pluginInfo => pluginInfo.plugin),
      this._extensionMap,
    );
  }

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

function listPluginContributions<TDefinition>(
  plugins: Map<string, IPluginInfoV2>,
  getDefinitions: (plugin: IPlugin) => TDefinition[],
  getId: (definition: TDefinition) => string,
): TDefinition[] {
  const definitionsById = new Map<string, TDefinition>();

  for (const { plugin } of plugins.values()) {
    for (const definition of getDefinitions(plugin)) {
      definitionsById.set(getId(definition), definition);
    }
  }

  return Array.from(definitionsById.values());
}
