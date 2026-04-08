/**
 * @fileoverview Orchestrates workspace analysis by coordinating
 * file discovery, plugin execution, and caching.
 * @module extension/WorkspacePipeline
 */

import * as vscode from 'vscode';
import type { IConnection } from '../../core/plugins/types/contracts';
import { PluginRegistry } from '../../core/plugins/registry/manager';
import { FileDiscovery } from '../../core/discovery/file/service';
import type { IDiscoveredFile } from '../../core/discovery/contracts';
import { Configuration } from '../config/reader';
import type { IGraphData } from '../../shared/graph/types';
import type { IPluginStatus } from '../../shared/plugins/status';
import { EventBus } from '../../core/plugins/events/bus';
import {
  type IWorkspaceAnalysisCache,
  loadWorkspaceAnalysisCache,
  WORKSPACE_ANALYSIS_CACHE_KEY,
} from './cache';
import {
  getWorkspacePipelinePluginFilterPatterns,
  initializeWorkspacePipeline,
} from './plugins/bootstrap';
import {
  getWorkspacePipelinePluginStatuses,
  resolveWorkspacePipelinePluginNameForFile,
} from './plugins/queries';
import {
  clearWorkspacePipelineCache,
  rebuildWorkspacePipelineGraphForSource,
} from './analysis/state';
import { runWorkspacePipelineAnalysis } from './analysis/run';
import {
  createWorkspacePipelineAnalysisSource,
  createWorkspacePipelineRebuildSource,
  type WorkspacePipelineSourceOwner,
} from './analysisSource';
import {
  analyzeWorkspacePipelineFiles,
  buildWorkspacePipelineGraphData,
  preAnalyzeWorkspacePipelinePlugins,
  readWorkspacePipelineFileStat,
  readWorkspacePipelineRoot,
} from './serviceAdapters';

/**
 * Orchestrates workspace analysis.
 * 
 * The WorkspacePipeline coordinates:
 * - File discovery using glob patterns
 * - Plugin-based connection detection
 * - Result caching for performance
 * - Graph data generation
 * 
 * @example
 * ```typescript
 * const analyzer = new WorkspacePipeline(context);
 * await analyzer.initialize();
 * const graphData = await analyzer.analyze();
 * ```
 */
export class WorkspacePipeline {
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
    await initializeWorkspacePipeline(this._registry, {
      getWorkspaceRoot: () => readWorkspacePipelineRoot(vscode.workspace.workspaceFolders),
    });

    console.log('[CodeGraphy] WorkspacePipeline initialized');
  }

  /**
   * Returns default filter patterns declared by all registered plugins.
   */
  getPluginFilterPatterns(): string[] {
    return getWorkspacePipelinePluginFilterPatterns(this._registry);
  }

  /**
   * Analyzes the workspace and returns graph data.
   * Uses caching for performance.
   */
  async analyze(
    filterPatterns: string[] = [],
    disabledSources: Set<string> = new Set(),
    disabledPlugins: Set<string> = new Set(),
    signal?: AbortSignal
  ): Promise<IGraphData> {
    return runWorkspacePipelineAnalysis(
      createWorkspacePipelineAnalysisSource(
        this as unknown as WorkspacePipelineSourceOwner,
      ),
      this._cache,
      this._config,
      this._discovery,
      this._context.workspaceState,
      () => this._getWorkspaceRoot(),
      filterPatterns,
      disabledSources,
      disabledPlugins,
      signal,
    );
  }

  /**
   * Rebuilds graph data from cached connections without re-analyzing files.
   * Used for instant graph updates when toggling sources/plugins.
   */
  rebuildGraph(disabledSources: Set<string>, disabledPlugins: Set<string>, showOrphans: boolean): IGraphData {
    return rebuildWorkspacePipelineGraphForSource(
      createWorkspacePipelineRebuildSource(
        this as unknown as WorkspacePipelineSourceOwner,
      ),
      disabledSources,
      disabledPlugins,
      showOrphans,
    );
  }

  /**
   * Computes the status of each registered plugin for the webview's Plugins panel.
   */
  getPluginStatuses(disabledSources: Set<string>, disabledPlugins: Set<string>): IPluginStatus[] {
    return getWorkspacePipelinePluginStatuses({
      disabledPlugins,
      disabledSources,
      discoveredFiles: this._lastDiscoveredFiles,
      fileConnections: this._lastFileConnections,
      registry: this._registry,
      workspaceRoot: this._lastWorkspaceRoot,
    });
  }

  /**
   * Gets the plugin display name for a workspace-relative file path.
   */
  getPluginNameForFile(relativePath: string): string | undefined {
    return resolveWorkspacePipelinePluginNameForFile(
      relativePath,
      this._lastWorkspaceRoot,
      () => readWorkspacePipelineRoot(vscode.workspace.workspaceFolders),
      this._registry,
    );
  }

  /**
   * Clears the analysis cache.
   */
  clearCache(): void {
    this._cache = clearWorkspacePipelineCache(
      this._context.workspaceState,
      message => {
        console.log(message);
      },
    );
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
  protected async _preAnalyzePlugins(
    files: IDiscoveredFile[],
    workspaceRoot: string,
    signal?: AbortSignal
  ): Promise<void> {
    await preAnalyzeWorkspacePipelinePlugins(
      files,
      workspaceRoot,
      this._registry,
      this._discovery,
      signal,
    );
  }

  /**
   * Analyzes discovered files, using cache where possible.
   */
  protected async _analyzeFiles(
    files: IDiscoveredFile[],
    workspaceRoot: string,
    signal?: AbortSignal
  ): Promise<Map<string, IConnection[]>> {
    return analyzeWorkspacePipelineFiles(
      this._cache,
      this._discovery,
      this._eventBus,
      this._registry,
      (filePath: string) => this._getFileStat(filePath),
      files,
      workspaceRoot,
      signal,
    );
  }

  /**
   * Builds graph data from file connections.
   */
  protected _buildGraphData(
    fileConnections: Map<string, IConnection[]>,
    workspaceRoot: string,
    showOrphans: boolean,
    disabledSources: Set<string> = new Set(),
    disabledPlugins: Set<string> = new Set()
  ): IGraphData {
    return buildWorkspacePipelineGraphData(
      this._cache,
      this._context,
      this._registry,
      fileConnections,
      workspaceRoot,
      showOrphans,
      disabledSources,
      disabledPlugins,
    );
  }

  /**
   * Gets the workspace root folder path.
   */
  private _getWorkspaceRoot(): string | undefined {
    return readWorkspacePipelineRoot(vscode.workspace.workspaceFolders);
  }

  /**
   * Gets file stat (mtime and size).
   */
  private async _getFileStat(filePath: string): Promise<{ mtime: number; size: number } | null> {
    return readWorkspacePipelineFileStat(filePath, vscode.workspace.fs);
  }
}
