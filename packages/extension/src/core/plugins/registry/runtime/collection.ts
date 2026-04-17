import type {
  IFileAnalysisResult,
  IPlugin,
  IPluginEdgeType,
  IPluginInfo,
  IPluginNodeType,
  IProjectedConnection,
} from '../../types/contracts';
import { rebuildPluginExtensionMap } from './extensionMap';
import {
  analyzeFile,
  analyzeFileResult,
} from '../../routing/router/analyze';
import {
  getPluginForFile,
  getPluginsForExtension,
  getSupportedExtensions,
  supportsFile,
} from '../../routing/router/lookups';
import { listPluginContributions } from './contributions';
import { buildReorderedPluginMap, replacePluginMap } from './order';
import { PluginRegistryState } from './state';

export abstract class PluginRegistryCollection extends PluginRegistryState {
  get(pluginId: string): IPluginInfo | undefined {
    return this._plugins.get(pluginId);
  }

  getPluginForFile(filePath: string): IPlugin | undefined {
    return getPluginForFile(filePath, this._plugins, this._extensionMap);
  }

  getPluginsForExtension(extension: string): IPlugin[] {
    return getPluginsForExtension(extension, this._plugins, this._extensionMap);
  }

  async analyzeFile(
    filePath: string,
    content: string,
    workspaceRoot: string,
  ): Promise<IProjectedConnection[]> {
    return analyzeFile(
      filePath,
      content,
      workspaceRoot,
      this._plugins,
      this._extensionMap,
      this._coreAnalyzeFileResult,
    );
  }

  async analyzeFileResult(
    filePath: string,
    content: string,
    workspaceRoot: string,
  ): Promise<IFileAnalysisResult | null> {
    return analyzeFileResult(
      filePath,
      content,
      workspaceRoot,
      this._plugins,
      this._extensionMap,
      this._coreAnalyzeFileResult,
    );
  }

  list(): IPluginInfo[] {
    return Array.from(this._plugins.values());
  }

  listNodeTypes(): IPluginNodeType[] {
    return listPluginContributions(
      this._plugins,
      (plugin) => plugin.contributeNodeTypes?.() ?? [],
      (definition) => definition.id,
    );
  }

  listEdgeTypes(): IPluginEdgeType[] {
    return listPluginContributions(
      this._plugins,
      (plugin) => plugin.contributeEdgeTypes?.() ?? [],
      (definition) => definition.id,
    );
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

  setCoreAnalyzeFileResult(
    analyzeFileResultProvider: typeof this._coreAnalyzeFileResult,
  ): void {
    this._coreAnalyzeFileResult = analyzeFileResultProvider;
  }

  setPluginOrder(pluginIds: string[] | undefined): void {
    if (!pluginIds || pluginIds.length === 0 || this._plugins.size <= 1) {
      return;
    }

    const reorderedPlugins = buildReorderedPluginMap(this._plugins, pluginIds);
    replacePluginMap(this._plugins, reorderedPlugins);

    rebuildPluginExtensionMap(
      Array.from(this._plugins.values(), (pluginInfo) => pluginInfo.plugin),
      this._extensionMap,
    );
  }

  disposeAll(): void {
    for (const [id] of this._plugins) {
      this.unregister(id);
    }
  }

  getPluginAPI(pluginId: string) {
    return this._plugins.get(pluginId)?.api;
  }

  replayReadinessForPlugin(pluginId: string): void {
    const info = this._plugins.get(pluginId);
    if (!info) {
      return;
    }

    this._replayReadinessForPlugin(info);
  }

  abstract unregister(pluginId: string): boolean;
}
