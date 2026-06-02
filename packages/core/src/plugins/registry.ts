import type {
  IFileAnalysisResult,
  IGraphData,
  IGraphViewContextMenuContribution,
  IGraphViewForceAdapterContribution,
  IGraphViewNodeDragEndContribution,
  IGraphViewProjectionContribution,
  IGraphViewRuntimeEdgeContribution,
  IGraphViewRuntimeNodeContribution,
  IGraphViewUiSlotContribution,
  IAccessProvider,
  IPlugin,
  IPluginAnalysisContext,
  IPluginEdgeType,
  IPluginNodeType,
} from '@codegraphy-dev/plugin-api';
import type { IProjectedConnection } from '../analysis/projectedConnection';
import { CORE_PLUGIN_API_VERSION } from './api';
import { initializeAll, initializePlugin } from './lifecycle/initialize';
import { notifyFilesChanged, type IPluginFilesChangedResult } from './lifecycle/notify/filesChanged';
import { notifyGraphRebuild, notifyPostAnalyze, notifyPreAnalyze } from './lifecycle/notify/analysis';
import {
  createEmptyGraphViewContributionSet,
  resolvePluginAccess,
  type CoreGraphViewContributionEntry,
  type CoreGraphViewContributionSet,
  type CorePluginAccessCheck,
  type CorePluginAccessContext,
} from './access/checks';
import { assertPluginApiCompatibility } from './compatibility';
import { listPluginContributions } from './contributions';
import { addPluginToExtensionMap } from './extensionMap';
import {
  analyzeFile,
  analyzeFileResult,
  type CoreFileAnalysisResultProvider,
} from './routing/router/analyze';
import {
  createCorePluginInfo,
  getPluginFilterPatterns,
  type RegisterPluginOptions,
} from './registration';
import {
  getPluginForFile,
  getPluginsForExtension,
  getSupportedExtensions,
  supportsFile,
} from './routing/router/lookups';
import { notifyWorkspaceReady } from './workspaceReady';

export { CORE_PLUGIN_API_VERSION };

export interface CorePluginInfo {
  plugin: IPlugin;
  builtIn: boolean;
  sourcePackage?: string;
  options?: Record<string, unknown>;
}

type AnalyzeFile = {
  absolutePath: string;
  relativePath: string;
  content: string;
};

export class CorePluginRegistry {
  private readonly plugins = new Map<string, CorePluginInfo>();
  private readonly extensionMap = new Map<string, string[]>();
  private readonly initializedPlugins = new Set<string>();
  private coreAnalyzeFileResult?: CoreFileAnalysisResultProvider;

  register(plugin: IPlugin, options: RegisterPluginOptions = {}): void {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin with ID '${plugin.id}' is already registered`);
    }

    assertPluginApiCompatibility(plugin);
    this.plugins.set(plugin.id, createCorePluginInfo(plugin, options));
    addPluginToExtensionMap(plugin, this.extensionMap);
  }

  async initializeAll(workspaceRoot: string): Promise<void> {
    await initializeAll(this.plugins, workspaceRoot, this.initializedPlugins);
  }

  async initializePlugin(pluginId: string, workspaceRoot: string): Promise<void> {
    const info = this.plugins.get(pluginId);
    if (!info) {
      return;
    }

    await initializePlugin(info, workspaceRoot, this.initializedPlugins);
  }

  get(pluginId: string): CorePluginInfo | undefined {
    return this.plugins.get(pluginId);
  }

  getPluginForFile(filePath: string): IPlugin | undefined {
    return getPluginForFile(filePath, this.plugins, this.extensionMap);
  }

  getPluginsForExtension(extension: string): IPlugin[] {
    return getPluginsForExtension(extension, this.plugins, this.extensionMap);
  }

  getSupportedExtensions(): string[] {
    return getSupportedExtensions(this.extensionMap);
  }

  supportsFile(filePath: string): boolean {
    return supportsFile(filePath, this.extensionMap);
  }

  list(): CorePluginInfo[] {
    return [...this.plugins.values()];
  }

  listNodeTypes(): IPluginNodeType[] {
    return listPluginContributions(
      this.plugins,
      plugin => plugin.contributeNodeTypes?.() ?? [],
      definition => definition.id,
    );
  }

  listEdgeTypes(): IPluginEdgeType[] {
    return listPluginContributions(
      this.plugins,
      plugin => plugin.contributeEdgeTypes?.() ?? [],
      definition => definition.id,
    );
  }

  getPluginFilterPatterns(disabledPlugins: ReadonlySet<string> = new Set()): string[] {
    return getPluginFilterPatterns(this.plugins.values(), disabledPlugins);
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
    const info = this.plugins.get(pluginId);
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

    for (const info of this.plugins.values()) {
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
      this.plugins,
      this.extensionMap,
      this.coreAnalyzeFileResult,
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
      this.plugins,
      this.extensionMap,
      this.coreAnalyzeFileResult,
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
      this.plugins,
      this.extensionMap,
      this.coreAnalyzeFileResult,
      analysisContext,
      { pluginIds: new Set(pluginIds) },
    );
  }

  setCoreAnalyzeFileResult(analyzeFileResultProvider: CoreFileAnalysisResultProvider | undefined): void {
    this.coreAnalyzeFileResult = analyzeFileResultProvider;
  }

  async notifyPreAnalyze(
    files: AnalyzeFile[],
    workspaceRoot: string,
    analysisContext?: IPluginAnalysisContext,
  ): Promise<void> {
    await notifyPreAnalyze(this.plugins, files, workspaceRoot, analysisContext);
  }

  async notifyFilesChanged(
    files: AnalyzeFile[],
    workspaceRoot: string,
    analysisContext?: IPluginAnalysisContext,
  ): Promise<IPluginFilesChangedResult> {
    return notifyFilesChanged(this.plugins, files, workspaceRoot, analysisContext);
  }

  notifyPostAnalyze(graph: IGraphData): void {
    notifyPostAnalyze(this.plugins, graph);
  }

  notifyWorkspaceReady(graph: IGraphData): void {
    notifyWorkspaceReady(this.plugins, graph);
  }

  notifyGraphRebuild(graph: IGraphData): void {
    notifyGraphRebuild(this.plugins, graph);
  }
}
