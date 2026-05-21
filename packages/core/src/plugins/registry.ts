import type {
  IFileAnalysisResult,
  IGraphData,
  IPlugin,
  IPluginAnalysisContext,
  IPluginEdgeType,
  IPluginNodeType,
} from '@codegraphy-dev/plugin-api';
import type { IProjectedConnection } from '../analysis/projectedConnection';
import { initializeAll, initializePlugin } from './lifecycle/initialize';
import { notifyFilesChanged, type IPluginFilesChangedResult } from './lifecycle/notify/filesChanged';
import { notifyGraphRebuild, notifyPostAnalyze, notifyPreAnalyze } from './lifecycle/notify/analysis';
import { normalizePluginExtension } from './routing/fileExtensions';
import { analyzeFile, analyzeFileResult, type CoreFileAnalysisResultProvider } from './routing/router/analyze';
import {
  getPluginForFile,
  getPluginsForExtension,
  getSupportedExtensions,
  supportsFile,
} from './routing/router/lookups';

export const CORE_PLUGIN_API_VERSION = '2.0.0';

export interface CorePluginInfo {
  plugin: IPlugin;
  builtIn: boolean;
  sourcePackage?: string;
  options?: Record<string, unknown>;
}

interface RegisterPluginOptions {
  builtIn?: boolean;
  sourcePackage?: string;
  options?: Record<string, unknown>;
}

function parseSemver(version: string): { major: number; minor: number; patch: number } | undefined {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version.trim());
  if (!match) {
    return undefined;
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function compareSemver(
  left: { major: number; minor: number; patch: number },
  right: { major: number; minor: number; patch: number },
): number {
  if (left.major !== right.major) return left.major - right.major;
  if (left.minor !== right.minor) return left.minor - right.minor;
  return left.patch - right.patch;
}

function satisfiesSemverRange(version: string, range: string): boolean {
  const target = parseSemver(version);
  if (!target) return false;

  const normalized = range.trim();
  if (/^\d+$/.test(normalized)) {
    return target.major === Number(normalized);
  }

  if (normalized.startsWith('^')) {
    const minimum = parseSemver(normalized.slice(1));
    if (!minimum) return false;
    const maximum = { major: minimum.major + 1, minor: 0, patch: 0 };
    return compareSemver(target, minimum) >= 0 && compareSemver(target, maximum) < 0;
  }

  const exact = parseSemver(normalized);
  return exact ? compareSemver(target, exact) === 0 : false;
}

function assertPluginApiCompatibility(plugin: IPlugin): void {
  if (typeof plugin.apiVersion !== 'string') {
    throw new Error(
      `Plugin '${plugin.id}' must declare a string apiVersion (for example '^${CORE_PLUGIN_API_VERSION}').`,
    );
  }

  if (!satisfiesSemverRange(CORE_PLUGIN_API_VERSION, plugin.apiVersion)) {
    throw new Error(
      `Plugin '${plugin.id}' targets unsupported CodeGraphy Plugin API '${plugin.apiVersion}'. ` +
      `Host provides '${CORE_PLUGIN_API_VERSION}'.`,
    );
  }
}

function addPluginToExtensionMap(
  plugin: IPlugin,
  extensionMap: Map<string, string[]>,
): void {
  for (const extension of plugin.supportedExtensions) {
    const normalizedExtension = extension === '*' ? extension : normalizePluginExtension(extension);
    const pluginIds = extensionMap.get(normalizedExtension) ?? [];
    if (!pluginIds.includes(plugin.id)) {
      pluginIds.push(plugin.id);
    }
    extensionMap.set(normalizedExtension, pluginIds);
  }
}

function listPluginContributions<TDefinition>(
  plugins: Map<string, CorePluginInfo>,
  getDefinitions: (plugin: IPlugin) => TDefinition[],
  getId: (definition: TDefinition) => string,
): TDefinition[] {
  const definitions = new Map<string, TDefinition>();
  for (const info of plugins.values()) {
    for (const definition of getDefinitions(info.plugin)) {
      definitions.set(getId(definition), definition);
    }
  }
  return [...definitions.values()];
}

function notifyWorkspaceReady(
  plugins: Map<string, CorePluginInfo>,
  graph: IGraphData,
): void {
  for (const info of plugins.values()) {
    if (!info.plugin.onWorkspaceReady) {
      continue;
    }

    try {
      info.plugin.onWorkspaceReady(graph);
    } catch (error) {
      console.error(`[CodeGraphy] Error in onWorkspaceReady for ${info.plugin.id}:`, error);
    }
  }
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
    const info: CorePluginInfo = {
      plugin,
      builtIn: options.builtIn ?? false,
      ...(options.sourcePackage ? { sourcePackage: options.sourcePackage } : {}),
      ...(options.options ? { options: { ...options.options } } : {}),
    };

    this.plugins.set(plugin.id, info);
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
    const patterns: string[] = [];
    for (const info of this.plugins.values()) {
      if (disabledPlugins.has(info.plugin.id)) {
        continue;
      }

      patterns.push(...info.plugin.defaultFilters ?? []);
    }

    return [...new Set(patterns)];
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
