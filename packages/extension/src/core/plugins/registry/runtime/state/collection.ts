import type {
  IAccessProvider,
  IFileAnalysisResult,
  IGraphViewContextMenuContribution,
  IGraphViewForceAdapterContribution,
  IGraphViewNodeDragEndContribution,
  IGraphViewProjectionContribution,
  IGraphViewRuntimeEdgeContribution,
  IGraphViewRuntimeNodeContribution,
  IGraphViewUiSlotContribution,
  IPlugin,
  IPluginAnalysisContext,
  IPluginEdgeType,
  IPluginInfo,
  IPluginNodeType,
  IProjectedConnection,
} from '../../../types/contracts';
import {
  createEmptyGraphViewContributionSet,
  resolvePluginAccess,
  type CoreGraphViewContributionEntry,
  type CoreGraphViewContributionSet,
  type CorePluginAccessCheck,
  type CorePluginAccessContext,
} from '@codegraphy/core';
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

export abstract class PluginRegistryCollection extends PluginRegistryState {
  get(pluginId: string): IPluginInfo | undefined {
    return this._plugins.get(pluginId);
  }

  private listAccessProviders(): IAccessProvider[] {
    return this.list()
      .map(info => info.plugin.accessProvider)
      .filter((provider): provider is IAccessProvider => provider !== undefined);
  }

  async getPluginAvailability(
    pluginId: string,
    context: CorePluginAccessContext = {},
  ): Promise<CorePluginAccessCheck | undefined> {
    const info = this._plugins.get(pluginId);
    if (!info) {
      return undefined;
    }

    return resolvePluginAccess(info.plugin, this.listAccessProviders(), context);
  }

  private async pushAvailableGraphViewContributions<TContribution extends { requiresAccess?: unknown }>(
    plugin: IPlugin,
    contributions: readonly TContribution[] | undefined,
    target: CoreGraphViewContributionEntry<TContribution>[],
    context: CorePluginAccessContext,
  ): Promise<void> {
    for (const contribution of contributions ?? []) {
      const contributionAccess = await resolvePluginAccess(
        plugin,
        this.listAccessProviders(),
        context,
        contribution.requiresAccess as never,
      );
      if (contributionAccess.available) {
        target.push({
          pluginId: plugin.id,
          contribution,
        });
      }
    }
  }

  async listAvailableGraphViewContributions(
    context: CorePluginAccessContext = {},
  ): Promise<CoreGraphViewContributionSet> {
    const contributions = createEmptyGraphViewContributionSet();

    for (const info of this._plugins.values()) {
      const pluginAccess = await resolvePluginAccess(info.plugin, this.listAccessProviders(), context);
      if (!pluginAccess.available) {
        continue;
      }

      await this.pushAvailableGraphViewContributions<IGraphViewRuntimeNodeContribution>(
        info.plugin,
        info.plugin.graphView?.runtimeNodes,
        contributions.runtimeNodes,
        context,
      );
      await this.pushAvailableGraphViewContributions<IGraphViewRuntimeEdgeContribution>(
        info.plugin,
        info.plugin.graphView?.runtimeEdges,
        contributions.runtimeEdges,
        context,
      );
      await this.pushAvailableGraphViewContributions<IGraphViewProjectionContribution>(
        info.plugin,
        info.plugin.graphView?.projections,
        contributions.projections,
        context,
      );
      await this.pushAvailableGraphViewContributions<IGraphViewForceAdapterContribution>(
        info.plugin,
        info.plugin.graphView?.forces,
        contributions.forces,
        context,
      );
      await this.pushAvailableGraphViewContributions<IGraphViewNodeDragEndContribution>(
        info.plugin,
        info.plugin.graphView?.nodeDragEnd,
        contributions.nodeDragEnd,
        context,
      );
      await this.pushAvailableGraphViewContributions<IGraphViewContextMenuContribution>(
        info.plugin,
        info.plugin.graphView?.contextMenu,
        contributions.contextMenu,
        context,
      );
      await this.pushAvailableGraphViewContributions<IGraphViewUiSlotContribution>(
        info.plugin,
        info.plugin.graphView?.ui,
        contributions.ui,
        context,
      );
    }

    return contributions;
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
