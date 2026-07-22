import type {
  IFileAnalysisResult,
  IGraphData,
  IPlugin,
  IPluginAnalysisContext,
  IPluginEdgeType,
  IPluginGraphScopeCapabilities,
  IPluginNodeType,
} from '@codegraphy-dev/plugin-api';
import type { IProjectedConnection } from '../analysis/projectedConnection';
import { CORE_PLUGIN_API_VERSION } from './api';
import { initializeAll, initializePlugin } from './lifecycle/initialize';
import { notifyFilesChanged, type IPluginFilesChangedResult } from './lifecycle/notify/filesChanged';
import { notifyGraphRebuild, notifyPostAnalyze, notifyPreAnalyze } from './lifecycle/notify/analysis';
import {
  listAccessProviders,
  resolvePluginAccess,
  type CorePluginAccessCheck,
  type CorePluginAccessContext,
} from './access/checks';
import { listPluginContributions } from './contributions';
import {
  analyzeFile,
  analyzeFileResult,
  type AnalyzeFileResultOptions,
  type CoreFileAnalysisResultProvider,
} from './routing/router/analyze';
import {
  getPluginFilterPatterns,
  registerCorePlugin,
  type RegisterPluginOptions,
} from './registration';
import {
  getPluginForFile,
  getPluginsForExtension,
  getSupportedExtensions,
  supportsFile,
} from './routing/router/lookups';
import { notifyWorkspaceReady } from './workspaceReady';
import { listGraphScopeCapabilities } from './graphScopeCapabilities';

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
    registerCorePlugin(plugin, options, this.plugins, this.extensionMap);
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

  listNodeTypes(disabledPlugins: ReadonlySet<string> = new Set()): IPluginNodeType[] {
    return listPluginContributions(
      this.plugins,
      plugin => plugin.contributeNodeTypes?.() ?? [],
      definition => definition.id,
      disabledPlugins,
    );
  }

  listEdgeTypes(disabledPlugins: ReadonlySet<string> = new Set()): IPluginEdgeType[] {
    return listPluginContributions(
      this.plugins,
      plugin => plugin.contributeEdgeTypes?.() ?? [],
      definition => definition.id,
      disabledPlugins,
    );
  }

  listGraphScopeCapabilities(
    filePaths: readonly string[] = [],
    disabledPlugins: ReadonlySet<string> = new Set(),
  ): Required<IPluginGraphScopeCapabilities> {
    return listGraphScopeCapabilities({
      disabledPlugins,
      extensionMap: this.extensionMap,
      filePaths,
      plugins: this.plugins,
    });
  }

  getPluginFilterPatterns(disabledPlugins: ReadonlySet<string> = new Set()): string[] {
    return getPluginFilterPatterns(this.plugins.values(), disabledPlugins);
  }

  async getPluginAvailability(
    pluginId: string,
    context: CorePluginAccessContext = {},
  ): Promise<CorePluginAccessCheck | undefined> {
    const info = this.plugins.get(pluginId);
    if (!info) {
      return undefined;
    }

    return resolvePluginAccess(info.plugin, listAccessProviders(this.plugins), context);
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
      this.plugins,
      this.extensionMap,
      this.coreAnalyzeFileResult,
      analysisContext,
      options,
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
      this.plugins,
      this.extensionMap,
      this.coreAnalyzeFileResult,
      analysisContext,
      options,
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
      this.plugins,
      this.extensionMap,
      this.coreAnalyzeFileResult,
      analysisContext,
      {
        ...options,
        pluginIds: new Set(pluginIds),
      },
    );
  }

  setCoreAnalyzeFileResult(analyzeFileResultProvider: CoreFileAnalysisResultProvider | undefined): void {
    this.coreAnalyzeFileResult = analyzeFileResultProvider;
  }

  async notifyPreAnalyze(
    files: AnalyzeFile[],
    workspaceRoot: string,
    analysisContext?: IPluginAnalysisContext,
    disabledPlugins: ReadonlySet<string> = new Set(),
  ): Promise<void> {
    await notifyPreAnalyze(this.plugins, files, workspaceRoot, analysisContext, disabledPlugins);
  }

  async notifyFilesChanged(
    files: AnalyzeFile[],
    workspaceRoot: string,
    analysisContext?: IPluginAnalysisContext,
    disabledPlugins: ReadonlySet<string> = new Set(),
  ): Promise<IPluginFilesChangedResult> {
    return notifyFilesChanged(this.plugins, files, workspaceRoot, analysisContext, disabledPlugins);
  }

  notifyPostAnalyze(graph: IGraphData, disabledPlugins: ReadonlySet<string> = new Set()): void {
    notifyPostAnalyze(this.plugins, graph, disabledPlugins);
  }

  notifyWorkspaceReady(graph: IGraphData, disabledPlugins: ReadonlySet<string> = new Set()): void {
    notifyWorkspaceReady(this.plugins, graph, disabledPlugins);
  }

  notifyGraphRebuild(graph: IGraphData, disabledPlugins: ReadonlySet<string> = new Set()): void {
    notifyGraphRebuild(this.plugins, graph, disabledPlugins);
  }
}
