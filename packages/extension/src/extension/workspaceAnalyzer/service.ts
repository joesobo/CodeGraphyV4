/**
 * @fileoverview Orchestrates workspace analysis by coordinating
 * file discovery, plugin execution, and caching.
 * @module extension/WorkspaceAnalyzer
 */

import * as vscode from 'vscode';
import type { IConnection } from '../../core/plugins/types/contracts';
import { PluginRegistry } from '../../core/plugins/registry/manager';
import { FileDiscovery } from '../../core/discovery/file/service';
import type { IDiscoveredFile } from '../../core/discovery/contracts';
import { Configuration } from '../config/reader';
import type { IGraphData } from '../../shared/graph/types';
import type { IPluginStatus } from '../../shared/plugins/status';
import { EventBus } from '../../core/plugins/eventBus';
import {
  IWorkspaceAnalysisCache,
  loadWorkspaceAnalysisCache,
  WORKSPACE_ANALYSIS_CACHE_KEY,
} from './cache';
import { type WorkspaceAnalyzerAnalysisSource } from './analysis/analyze';
import {
  analyzeWorkspaceAnalyzerSourceFiles,
  type WorkspaceAnalyzerFilesSource,
} from './analysis/files';
import {
  buildWorkspaceAnalyzerGraphForSource,
  type WorkspaceAnalyzerGraphSource,
} from './graph/build';
import {
  getWorkspaceAnalyzerPluginFilterPatterns,
  initializeWorkspaceAnalyzer,
} from './plugins/bootstrap';
import {
  getWorkspaceAnalyzerFileStat,
  getWorkspaceAnalyzerRoot,
} from './io';
import { preAnalyzeWorkspaceAnalyzerFiles } from './analysis/preAnalyze';
import {
  getWorkspaceAnalyzerPluginStatuses,
  resolveWorkspaceAnalyzerPluginNameForFile,
} from './plugins/queries';
import {
  clearWorkspaceAnalyzerCache,
  rebuildWorkspaceAnalyzerGraphForSource,
} from './analysis/state';
import { runWorkspaceAnalyzerAnalysis } from './analysis/run';

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
    await initializeWorkspaceAnalyzer(this._registry, {
      getWorkspaceRoot: () => getWorkspaceAnalyzerRoot(vscode.workspace.workspaceFolders),
    });

    console.log('[CodeGraphy] WorkspaceAnalyzer initialized');
  }

  /**
   * Returns default filter patterns declared by all registered plugins.
   */
  getPluginFilterPatterns(): string[] {
    return getWorkspaceAnalyzerPluginFilterPatterns(this._registry);
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
    const source = {
      _analyzeFiles: (
        files: IDiscoveredFile[],
        workspaceRoot: string,
        nextSignal?: AbortSignal,
      ) => this._analyzeFiles(files, workspaceRoot, nextSignal),
      _buildGraphData: (
        fileConnections: Map<string, IConnection[]>,
        workspaceRoot: string,
        showOrphans: boolean,
        nextDisabledRules: Set<string>,
        nextDisabledPlugins: Set<string>,
      ) =>
        this._buildGraphData(
          fileConnections,
          workspaceRoot,
          showOrphans,
          nextDisabledRules,
          nextDisabledPlugins,
        ),
      _preAnalyzePlugins: (
        files: IDiscoveredFile[],
        workspaceRoot: string,
        nextSignal?: AbortSignal,
      ) => this._preAnalyzePlugins(files, workspaceRoot, nextSignal),
      getPluginFilterPatterns: () => this.getPluginFilterPatterns(),
    } as WorkspaceAnalyzerAnalysisSource;
    Object.defineProperties(source, {
      _eventBus: {
        get: () => this._eventBus,
      },
      _lastDiscoveredFiles: {
        get: () => this._lastDiscoveredFiles,
        set: (files: IDiscoveredFile[]) => {
          this._lastDiscoveredFiles = files;
        },
      },
      _lastFileConnections: {
        get: () => this._lastFileConnections,
        set: (fileConnections: Map<string, IConnection[]>) => {
          this._lastFileConnections = fileConnections;
        },
      },
      _lastWorkspaceRoot: {
        get: () => this._lastWorkspaceRoot,
        set: (workspaceRoot: string) => {
          this._lastWorkspaceRoot = workspaceRoot;
        },
      },
    });

    return runWorkspaceAnalyzerAnalysis(
      source,
      this._cache,
      this._config,
      this._discovery,
      this._context.workspaceState,
      () => this._getWorkspaceRoot(),
      filterPatterns,
      disabledRules,
      disabledPlugins,
      signal,
    );
  }

  /**
   * Rebuilds graph data from cached connections without re-analyzing files.
   * Used for instant graph updates when toggling rules/plugins.
   */
  rebuildGraph(disabledRules: Set<string>, disabledPlugins: Set<string>, showOrphans: boolean): IGraphData {
    const source = {
      _buildGraphData: (
        fileConnections: Map<string, IConnection[]>,
        workspaceRoot: string,
        nextShowOrphans: boolean,
        nextDisabledRules: Set<string>,
        nextDisabledPlugins: Set<string>,
      ) =>
        this._buildGraphData(
          fileConnections,
          workspaceRoot,
          nextShowOrphans,
          nextDisabledRules,
          nextDisabledPlugins,
        ),
    } as import('./analysis/state').WorkspaceAnalyzerRebuildSource;
    Object.defineProperties(source, {
      _lastFileConnections: {
        get: () => this._lastFileConnections,
      },
      _lastWorkspaceRoot: {
        get: () => this._lastWorkspaceRoot,
      },
    });

    return rebuildWorkspaceAnalyzerGraphForSource(
      source,
      disabledRules,
      disabledPlugins,
      showOrphans,
    );
  }

  /**
   * Computes the status of each registered plugin for the webview's Plugins panel.
   */
  getPluginStatuses(disabledRules: Set<string>, disabledPlugins: Set<string>): IPluginStatus[] {
    return getWorkspaceAnalyzerPluginStatuses({
      disabledPlugins,
      disabledRules,
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
    return resolveWorkspaceAnalyzerPluginNameForFile(
      relativePath,
      this._lastWorkspaceRoot,
      () => getWorkspaceAnalyzerRoot(vscode.workspace.workspaceFolders),
      this._registry,
    );
  }

  /**
   * Clears the analysis cache.
   */
  clearCache(): void {
    this._cache = clearWorkspaceAnalyzerCache(
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
  private async _preAnalyzePlugins(
    files: IDiscoveredFile[],
    workspaceRoot: string,
    signal?: AbortSignal
  ): Promise<void> {
    await preAnalyzeWorkspaceAnalyzerFiles(
      files,
      workspaceRoot,
      {
        notifyPreAnalyze: (v2Files, rootPath) =>
          this._registry.notifyPreAnalyze(v2Files, rootPath),
        readContent: file => this._discovery.readContent(file),
      },
      signal,
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
    const source: WorkspaceAnalyzerFilesSource = {
      _cache: this._cache,
      _discovery: this._discovery,
      _eventBus: this._eventBus,
      _getFileStat: (filePath: string) => this._getFileStat(filePath),
      _registry: this._registry,
    };

    return analyzeWorkspaceAnalyzerSourceFiles(
      source,
      files,
      workspaceRoot,
      message => {
        console.log(message);
      },
      signal,
    );
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
    const source: WorkspaceAnalyzerGraphSource = {
      _cache: this._cache,
      _context: this._context,
      _registry: this._registry,
    };

    return buildWorkspaceAnalyzerGraphForSource(
      source,
      fileConnections,
      workspaceRoot,
      showOrphans,
      disabledRules,
      disabledPlugins,
    );
  }

  /**
   * Gets the workspace root folder path.
   */
  private _getWorkspaceRoot(): string | undefined {
    return getWorkspaceAnalyzerRoot(vscode.workspace.workspaceFolders);
  }

  /**
   * Gets file stat (mtime and size).
   */
  private async _getFileStat(filePath: string): Promise<{ mtime: number; size: number } | null> {
    return getWorkspaceAnalyzerFileStat(filePath, vscode.workspace.fs);
  }

}
