import type {
  IFileAnalysisResult,
  IPlugin,
  IPluginAnalysisContext,
  IPluginEdgeType,
  IPluginGraphScopeCapabilities,
  IPluginInfo,
  IPluginNodeType,
  IProjectedConnection,
  GraphEdgeKind,
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
  type AnalyzeFileResultOptions,
} from '../../../routing/router/analyze';
import {
  getPluginForFile,
  getPluginsForFile,
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
    return listAvailableGraphViewContributionsForPlugins(
      this._plugins.values(),
      context,
      (pluginId, error) => this._disableFailedPlugin(pluginId, 'graphView contributions', error),
    );
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
    options: AnalyzeFileResultOptions = {},
  ): Promise<IProjectedConnection[]> {
    return analyzeFile(
      filePath,
      content,
      workspaceRoot,
      this._plugins,
      this._extensionMap,
      this._coreAnalyzeFileResult,
      analysisContext,
      {
        ...options,
        onPluginError: (pluginId, error, hook) => {
          options.onPluginError?.(pluginId, error, hook);
          this._disableFailedPlugin(pluginId, hook, error);
        },
      },
    );
  }

  async analyzeFileResult(
    filePath: string,
    content: string,
    workspaceRoot: string,
    analysisContext?: IPluginAnalysisContext,
    options: AnalyzeFileResultOptions = {},
  ): Promise<IFileAnalysisResult | null> {
    return analyzeFileResult(
      filePath,
      content,
      workspaceRoot,
      this._plugins,
      this._extensionMap,
      this._coreAnalyzeFileResult,
      analysisContext,
      {
        ...options,
        onPluginError: (pluginId, error, hook) => {
          options.onPluginError?.(pluginId, error, hook);
          this._disableFailedPlugin(pluginId, hook, error);
        },
      },
    );
  }

  async analyzeFileResultForPlugins(
    filePath: string,
    content: string,
    workspaceRoot: string,
    pluginIds: readonly string[],
    analysisContext?: IPluginAnalysisContext,
    options: AnalyzeFileResultOptions = {},
  ): Promise<IFileAnalysisResult | null> {
    return analyzeFileResult(
      filePath,
      content,
      workspaceRoot,
      this._plugins,
      this._extensionMap,
      this._coreAnalyzeFileResult,
      analysisContext,
      {
        ...options,
        pluginIds: new Set(pluginIds),
        onPluginError: (pluginId, error, hook) => {
          options.onPluginError?.(pluginId, error, hook);
          this._disableFailedPlugin(pluginId, hook, error);
        },
      },
    );
  }

  list(): IPluginInfo[] {
    return Array.from(this._plugins.values());
  }

  listNodeTypes(disabledPlugins: ReadonlySet<string> = new Set()): IPluginNodeType[] {
    return listPluginContributions(
      this._plugins,
      (plugin) => plugin.contributeNodeTypes?.() ?? [],
      (definition) => definition.id,
      disabledPlugins,
    );
  }

  listEdgeTypes(disabledPlugins: ReadonlySet<string> = new Set()): IPluginEdgeType[] {
    return listPluginContributions(
      this._plugins,
      (plugin) => plugin.contributeEdgeTypes?.() ?? [],
      (definition) => definition.id,
      disabledPlugins,
    );
  }

  listGraphScopeCapabilities(
    filePaths: readonly string[] = [],
    disabledPlugins: ReadonlySet<string> = new Set(),
  ): Required<IPluginGraphScopeCapabilities> {
    const applicableFilePathsByPluginId = new Map<string, string[]>();

    for (const filePath of filePaths) {
      for (const plugin of getPluginsForFile(filePath, this._plugins, this._extensionMap)) {
        if (disabledPlugins.has(plugin.id)) {
          continue;
        }

        const pluginFilePaths = applicableFilePathsByPluginId.get(plugin.id) ?? [];
        pluginFilePaths.push(filePath);
        applicableFilePathsByPluginId.set(plugin.id, pluginFilePaths);
      }
    }

    const coreCapabilities = this._coreGraphScopeCapabilitiesProvider?.(filePaths);
    const nodeTypes = new Set<string>(coreCapabilities?.nodeTypes ?? []);
    const edgeTypes = new Set<GraphEdgeKind>(coreCapabilities?.edgeTypes ?? []);

    for (const [pluginId, pluginFilePaths] of applicableFilePathsByPluginId) {
      const plugin = this._plugins.get(pluginId)?.plugin;
      const capabilities = plugin?.contributeGraphScopeCapabilities?.({ filePaths: pluginFilePaths });
      for (const nodeType of capabilities?.nodeTypes ?? []) {
        nodeTypes.add(nodeType);
      }
      for (const edgeType of capabilities?.edgeTypes ?? []) {
        edgeTypes.add(edgeType);
      }
    }

    return {
      nodeTypes: [...nodeTypes],
      edgeTypes: [...edgeTypes],
    };
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

  setCoreGraphScopeCapabilitiesProvider(
    provider: typeof this._coreGraphScopeCapabilitiesProvider,
  ): void {
    this._coreGraphScopeCapabilitiesProvider = provider;
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
