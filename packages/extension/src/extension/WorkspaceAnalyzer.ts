/**
 * @fileoverview Orchestrates workspace analysis by coordinating
 * file discovery, plugin execution, and caching.
 * @module extension/WorkspaceAnalyzer
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { PluginRegistry, IConnection } from '../core/plugins';
import { FileDiscovery, IDiscoveredFile } from '../core/discovery';
import { Configuration } from './Configuration';
import { createTypeScriptPlugin } from '../../../plugin-typescript/src';
import { createGDScriptPlugin } from '../../../plugin-godot/src';
import { createPythonPlugin } from '../../../plugin-python/src';
import { createCSharpPlugin } from '../../../plugin-csharp/src';
import { createMarkdownPlugin } from '../../../plugin-markdown/src';
import { IGraphData, IPluginStatus } from '../shared/types';
import { EventBus } from '../core/plugins/EventBus';
import { DEFAULT_EXCLUDE_PATTERNS } from './Configuration';
import { throwIfWorkspaceAnalysisAborted } from './workspaceAnalyzerAbort';
import {
  createEmptyWorkspaceAnalysisCache,
  IWorkspaceAnalysisCache,
  loadWorkspaceAnalysisCache,
  saveWorkspaceAnalysisCache,
  WORKSPACE_ANALYSIS_CACHE_KEY,
} from './workspaceAnalysisCache';
import { buildWorkspaceGraphData } from './workspaceGraphData';
import { analyzeWorkspaceFiles } from './workspaceFileAnalysis';
import { buildWorkspacePluginStatuses } from './workspacePluginStatuses';

/** Storage key for file visit counts in workspace state (shared with GraphViewProvider) */
const VISITS_KEY = 'codegraphy.fileVisits';

/**
 * Orchestrates workspace analysis.
 * 
 * The WorkspaceAnalyzer coordinates:
 * - File discovery using glob patterns
 * - Plugin-based connection detection
 * - Result caching for performance
 * - Graph data generation
 * 
 * @example
 * ```typescript
 * const analyzer = new WorkspaceAnalyzer(context);
 * await analyzer.initialize();
 * const graphData = await analyzer.analyze();
 * ```
 */
export class WorkspaceAnalyzer {
  private readonly _config: Configuration;
  private readonly _registry: PluginRegistry;
  private readonly _discovery: FileDiscovery;
  private readonly _context: vscode.ExtensionContext;
  private _cache: IWorkspaceAnalysisCache;
  private _lastFileConnections: Map<string, IConnection[]> = new Map();
  private _lastDiscoveredFiles: IDiscoveredFile[] = [];
  private _lastWorkspaceRoot: string = '';
  private _eventBus?: EventBus;

  constructor(context: vscode.ExtensionContext) {
    this._context = context;
    this._config = new Configuration();
    this._registry = new PluginRegistry();
    this._discovery = new FileDiscovery();
    this._cache = loadWorkspaceAnalysisCache(
      this._context.workspaceState.get<IWorkspaceAnalysisCache>(WORKSPACE_ANALYSIS_CACHE_KEY)
    );
  }

  /**
   * Sets the event bus for emitting analysis events.
   */
  setEventBus(eventBus: EventBus): void {
    this._eventBus = eventBus;
  }

  /**
   * Exposes the plugin registry for external use (e.g., GraphViewProvider).
   */
  get registry(): PluginRegistry {
    return this._registry;
  }

  /**
   * Initializes the analyzer and registers built-in plugins.
   */
  async initialize(): Promise<void> {
    // Register built-in TypeScript plugin
    const tsPlugin = createTypeScriptPlugin();
    this._registry.register(tsPlugin, { builtIn: true });

    // Register built-in GDScript plugin
    const gdPlugin = createGDScriptPlugin();
    this._registry.register(gdPlugin, { builtIn: true });

    // Register built-in Python plugin
    const pyPlugin = createPythonPlugin();
    this._registry.register(pyPlugin, { builtIn: true });

    // Register built-in C# plugin
    const csPlugin = createCSharpPlugin();
    this._registry.register(csPlugin, { builtIn: true });

    // Register built-in Markdown plugin
    const mdPlugin = createMarkdownPlugin();
    this._registry.register(mdPlugin, { builtIn: true });

    // Initialize all plugins
    const workspaceRoot = this._getWorkspaceRoot();
    if (workspaceRoot) {
      await this._registry.initializeAll(workspaceRoot);
    }

    console.log('[CodeGraphy] WorkspaceAnalyzer initialized');
  }

  /**
   * Returns default filter patterns declared by all registered plugins.
   */
  getPluginFilterPatterns(): string[] {
    const patterns: string[] = [];
    for (const pluginInfo of this._registry.list()) {
      if (pluginInfo.plugin.defaultFilters) {
        patterns.push(...pluginInfo.plugin.defaultFilters);
      }
    }
    return [...new Set(patterns)];
  }

  /**
   * Analyzes the workspace and returns graph data.
   * Uses caching for performance.
   */
  async analyze(
    filterPatterns: string[] = [],
    disabledRules: Set<string> = new Set(),
    disabledPlugins: Set<string> = new Set(),
    signal?: AbortSignal
  ): Promise<IGraphData> {
    throwIfWorkspaceAnalysisAborted(signal);

    const workspaceRoot = this._getWorkspaceRoot();
    if (!workspaceRoot) {
      console.log('[CodeGraphy] No workspace folder open');
      return { nodes: [], edges: [] };
    }

    // Discover ALL files (not filtered by extension)
    // Non-code files will appear as orphans if showOrphans is enabled
    const config = this._config.getAll();

    // Collect default filter patterns from all plugins
    const pluginFilters = this.getPluginFilterPatterns();

    // Merge: hardcoded defaults + plugin filters + user filter patterns
    const mergedExclude = [...new Set([...DEFAULT_EXCLUDE_PATTERNS, ...pluginFilters, ...filterPatterns])];

    const discoveryResult = await this._discovery.discover({
      rootPath: workspaceRoot,
      maxFiles: config.maxFiles,
      include: config.include,
      exclude: mergedExclude,
      respectGitignore: config.respectGitignore,
      signal,
      // Don't filter by extensions - we want all files as nodes
    });

    throwIfWorkspaceAnalysisAborted(signal);

    if (discoveryResult.limitReached) {
      vscode.window.showWarningMessage(
        `CodeGraphy: Found ${discoveryResult.totalFound}+ files, showing first ${config.maxFiles}. ` +
        `Increase codegraphy.maxFiles in settings to see more.`
      );
    }

    console.log(`[CodeGraphy] Discovered ${discoveryResult.files.length} files in ${discoveryResult.durationMs}ms`);

    this._eventBus?.emit('analysis:started', { fileCount: discoveryResult.files.length });

    // Pre-analysis pass: let plugins build workspace-wide indexes before per-file analysis.
    // Needed for cross-file references that require seeing all files first (e.g. GDScript class_name).
    await this._preAnalyzePlugins(discoveryResult.files, workspaceRoot, signal);

    // Analyze files (with caching)
    const fileConnections = await this._analyzeFiles(discoveryResult.files, workspaceRoot, signal);

    throwIfWorkspaceAnalysisAborted(signal);

    // Store results for instant rebuilding via rebuildGraph()
    this._lastFileConnections = fileConnections;
    this._lastDiscoveredFiles = discoveryResult.files;
    this._lastWorkspaceRoot = workspaceRoot;

    // Build graph data
    const graphData = this._buildGraphData(fileConnections, workspaceRoot, config.showOrphans, disabledRules, disabledPlugins);

    // Save cache
    saveWorkspaceAnalysisCache(this._context.workspaceState.update.bind(this._context.workspaceState), this._cache);

    console.log(`[CodeGraphy] Graph built: ${graphData.nodes.length} nodes, ${graphData.edges.length} edges`);

    this._eventBus?.emit('analysis:completed', {
      graph: {
        nodes: graphData.nodes.map(n => ({ id: n.id })),
        edges: graphData.edges.map(e => ({ id: e.id })),
      },
      duration: 0,
    });

    return graphData;
  }

  /**
   * Rebuilds graph data from cached connections without re-analyzing files.
   * Used for instant graph updates when toggling rules/plugins.
   */
  rebuildGraph(disabledRules: Set<string>, disabledPlugins: Set<string>, showOrphans: boolean): IGraphData {
    if (this._lastFileConnections.size === 0) {
      return { nodes: [], edges: [] };
    }
    return this._buildGraphData(
      this._lastFileConnections,
      this._lastWorkspaceRoot,
      showOrphans,
      disabledRules,
      disabledPlugins
    );
  }

  /**
   * Computes the status of each registered plugin for the webview's Plugins panel.
   */
  getPluginStatuses(disabledRules: Set<string>, disabledPlugins: Set<string>): IPluginStatus[] {
    return buildWorkspacePluginStatuses({
      disabledPlugins,
      disabledRules,
      discoveredFiles: this._lastDiscoveredFiles,
      fileConnections: this._lastFileConnections,
      pluginInfos: this._registry.list(),
      workspaceRoot: this._lastWorkspaceRoot,
      getPluginForFile: (absolutePath) => this._registry.getPluginForFile(absolutePath),
    });
  }

  /**
   * Gets the plugin display name for a workspace-relative file path.
   */
  getPluginNameForFile(relativePath: string): string | undefined {
    const workspaceRoot = this._lastWorkspaceRoot || this._getWorkspaceRoot();
    if (!workspaceRoot) return undefined;
    const plugin = this._registry.getPluginForFile(path.join(workspaceRoot, relativePath));
    return plugin?.name;
  }

  /**
   * Clears the analysis cache.
   */
  clearCache(): void {
    this._cache = createEmptyWorkspaceAnalysisCache();
    saveWorkspaceAnalysisCache(this._context.workspaceState.update.bind(this._context.workspaceState), this._cache);
    console.log('[CodeGraphy] Cache cleared');
  }

  /**
   * Disposes of the analyzer and its resources.
   */
  dispose(): void {
    this._registry.disposeAll();
  }

  /**
   * Pre-analysis pass: dispatches onPreAnalyze to registered plugins.
   * Reads file content once and shares it with all plugins.
   */
  private async _preAnalyzePlugins(
    files: IDiscoveredFile[],
    workspaceRoot: string,
    signal?: AbortSignal
  ): Promise<void> {
    throwIfWorkspaceAnalysisAborted(signal);

    const contentByRelativePath = new Map<string, Promise<string>>();
    const getFileContent = (file: IDiscoveredFile): Promise<string> => {
      const cached = contentByRelativePath.get(file.relativePath);
      if (cached) {
        return cached;
      }

      const contentPromise = this._discovery.readContent(file);
      contentByRelativePath.set(file.relativePath, contentPromise);
      return contentPromise;
    };

    const v2Files = await Promise.all(files.map(async (file) => ({
      absolutePath: file.absolutePath,
      relativePath: file.relativePath,
      content: await getFileContent(file),
    })));
    await this._registry.notifyPreAnalyze(
      v2Files,
      workspaceRoot
    );
  }

  /**
   * Analyzes discovered files, using cache where possible.
   */
  private async _analyzeFiles(
    files: IDiscoveredFile[],
    workspaceRoot: string,
    signal?: AbortSignal
  ): Promise<Map<string, IConnection[]>> {
    const result = await analyzeWorkspaceFiles({
      analyzeFile: (absolutePath, content, rootPath) => this._registry.analyzeFile(absolutePath, content, rootPath),
      cache: this._cache,
      emitFileProcessed: this._eventBus
        ? (payload) => this._eventBus?.emit('analysis:fileProcessed', payload)
        : undefined,
      files,
      getFileStat: (filePath) => this._getFileStat(filePath),
      readContent: (file) => this._discovery.readContent(file),
      signal,
      workspaceRoot,
    });

    console.log(`[CodeGraphy] Analysis: ${result.cacheHits} cache hits, ${result.cacheMisses} misses`);
    return result.fileConnections;
  }

  /**
   * Builds graph data from file connections.
   */
  private _buildGraphData(
    fileConnections: Map<string, IConnection[]>,
    workspaceRoot: string,
    showOrphans: boolean,
    disabledRules: Set<string> = new Set(),
    disabledPlugins: Set<string> = new Set()
  ): IGraphData {
    const visitCounts = this._context.workspaceState.get<Record<string, number>>(VISITS_KEY) ?? {};

    return buildWorkspaceGraphData({
      cacheFiles: this._cache.files,
      disabledPlugins,
      disabledRules,
      fileConnections,
      showOrphans,
      visitCounts,
      workspaceRoot,
      getPluginForFile: (absolutePath) => this._registry.getPluginForFile(absolutePath),
    });
  }


  /**
   * Gets the workspace root folder path.
   */
  private _getWorkspaceRoot(): string | undefined {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  }

  /**
   * Gets file stat (mtime and size).
   */
  private async _getFileStat(filePath: string): Promise<{ mtime: number; size: number } | null> {
    try {
      const stat = await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
      return { mtime: stat.mtime, size: stat.size };
    } catch {
      return null;
    }
  }

}
