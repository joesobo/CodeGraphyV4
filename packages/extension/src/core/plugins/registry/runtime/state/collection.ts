import type {
  IFileAnalysisResult,
  IPlugin,
  IPluginAnalysisContext,
  IPluginEdgeType,
  IPluginInfo,
  IPluginNodeType,
  IProjectedConnection,
} from '../../../types/contracts';
import {
  resolvePluginAccess,
  type CoreGraphViewContributionSet,
  type CorePluginAccessCheck,
  type CorePluginAccessContext,
} from '@codegraphy-dev/core';
import {
  analyzeFile,
  analyzeFileResult,
} from '../../../routing/router/analyze';
import {
  getPluginForFile,
  getPluginsForExtension,
  getSupportedExtensions,
  supportsFile,
} from '../../../routing/router/lookups';
import { listPluginContributions } from '../maps/contributions';
import { PluginRegistryState } from './store';
import {
  listAvailableGraphViewContributionsForPlugins,
  listPluginAccessProviders,
} from './graphViewContributions';

export abstract class PluginRegistryCollection extends PluginRegistryState {
  get(pluginId: string): IPluginInfo | undefined {
    return this._plugins.get(pluginId);
  }

  async getPluginAvailability(
    pluginId: string,
    context: CorePluginAccessContext = {},
  ): Promise<CorePluginAccessCheck | undefined> {
    const info = this._plugins.get(pluginId);
    if (!info) {
      return undefined;
    }

    return resolvePluginAccess(
      info.plugin,
      listPluginAccessProviders(this._plugins.values()),
      context,
    );
  }

  async listAvailableGraphViewContributions(
    context: CorePluginAccessContext = {},
  ): Promise<CoreGraphViewContributionSet> {
    return listAvailableGraphViewContributionsForPlugins(this._plugins.values(), context);
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
    analysisContext?: IPluginAnalysisContext,
  ): Promise<IProjectedConnection[]> {
    return analyzeFile(
      filePath,
      content,
      workspaceRoot,
      this._plugins,
      this._extensionMap,
      this._coreAnalyzeFileResult,
      analysisContext,
    );
  }

  async analyzeFileResult(
    filePath: string,
    content: string,
    workspaceRoot: string,
    analysisContext?: IPluginAnalysisContext,
  ): Promise<IFileAnalysisResult | null> {
    return analyzeFileResult(
      filePath,
      content,
      workspaceRoot,
      this._plugins,
      this._extensionMap,
      this._coreAnalyzeFileResult,
      analysisContext,
    );
  }

  async analyzeFileResultForPlugins(
    filePath: string,
    content: string,
    workspaceRoot: string,
    pluginIds: readonly string[],
    analysisContext?: IPluginAnalysisContext,
  ): Promise<IFileAnalysisResult | null> {
    return analyzeFileResult(
      filePath,
      content,
      workspaceRoot,
      this._plugins,
      this._extensionMap,
      this._coreAnalyzeFileResult,
      analysisContext,
      { pluginIds: new Set(pluginIds) },
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
