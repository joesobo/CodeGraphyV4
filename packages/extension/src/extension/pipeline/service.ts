/**
 * @fileoverview Orchestrates workspace analysis by coordinating
 * file discovery, plugin execution, and caching.
 * @module extension/WorkspacePipeline
 */

import * as vscode from 'vscode';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import type {
  IProjectedConnection,
  IFileAnalysisResult,
} from '../../core/plugins/types/contracts';
import { PluginRegistry } from '../../core/plugins/registry/manager';
import { FileDiscovery } from '../../core/discovery/file/service';
import type { IDiscoveredFile } from '../../core/discovery/contracts';
import { Configuration } from '../config/reader';
import type { IGraphData } from '../../shared/graph/types';
import type { IPluginStatus } from '../../shared/plugins/status';
import { EventBus } from '../../core/plugins/events/bus';
import {
  createEmptyWorkspaceAnalysisCache,
  type IWorkspaceAnalysisCache,
} from './cache';
import {
  loadWorkspaceAnalysisDatabaseCache,
  readWorkspaceAnalysisDatabaseSnapshot,
  saveWorkspaceAnalysisDatabaseCache,
  type WorkspaceAnalysisDatabaseSnapshot,
} from './database/cache.ts';
import {
  getWorkspacePipelinePluginFilterPatterns,
  initializeWorkspacePipeline,
} from './plugins/bootstrap';
import {
  getWorkspacePipelinePluginStatuses,
  resolveWorkspacePipelinePluginNameForFile,
} from './plugins/queries';
import { projectConnectionMapFromFileAnalysis } from './projection';
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
  readWorkspacePipelineFileStat,
  readWorkspacePipelineRoot,
} from './serviceAdapters';
import { preAnalyzeWorkspacePipelineFiles } from './analysis/preAnalyze';
import type { IWorkspaceFileAnalysisResult } from './fileAnalysis';
import type {
  WorkspacePipelineDiscoveryDependencies,
  WorkspacePipelineDiscoveryResult,
} from './discovery';
import {
  discoverWorkspacePipelineFiles,
  formatWorkspacePipelineLimitReachedMessage,
} from './discovery';
import {
  readCodeGraphyRepoMeta,
  writeCodeGraphyRepoMeta,
} from '../repoSettings/meta';
import {
  createCodeGraphyPluginSignature,
  createCodeGraphySettingsSignature,
} from '../repoSettings/signatures';
import { execGitCommand } from '../gitHistory/exec';

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
  private _lastFileAnalysis: Map<string, IFileAnalysisResult> = new Map();
  private _lastFileConnections: Map<string, IProjectedConnection[]> = new Map();
  private _lastDiscoveredFiles: IDiscoveredFile[] = [];
  private _lastWorkspaceRoot: string = '';
  private _eventBus?: EventBus;

  constructor(context: vscode.ExtensionContext) {
    this._context = context;
    this._config = new Configuration();
    this._registry = new PluginRegistry();
    this._discovery = new FileDiscovery();
    const workspaceRoot = readWorkspacePipelineRoot(vscode.workspace.workspaceFolders);
    const repoCache = workspaceRoot
      ? loadWorkspaceAnalysisDatabaseCache(workspaceRoot)
      : undefined;
    this._cache = repoCache ?? createEmptyWorkspaceAnalysisCache();
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

  get lastFileAnalysis(): ReadonlyMap<string, IFileAnalysisResult> {
    return this._lastFileAnalysis;
  }

  readStructuredAnalysisSnapshot(): WorkspaceAnalysisDatabaseSnapshot {
    const workspaceRoot = this._getWorkspaceRoot();
    if (!workspaceRoot) {
      return { files: [], symbols: [], relations: [] };
    }

    return readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot);
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

  hasIndex(): boolean {
    const workspaceRoot = this._getWorkspaceRoot();
    if (!workspaceRoot) {
      return false;
    }

    const meta = readCodeGraphyRepoMeta(workspaceRoot);
    if (meta.lastIndexedAt === null) {
      return false;
    }

    const signaturesMatch =
      meta.pluginSignature === this._getPluginSignature()
      && meta.settingsSignature === this._getSettingsSignature();
    if (!signaturesMatch) {
      return false;
    }

    const currentCommit = this._getCurrentCommitShaSync(workspaceRoot);
    if (currentCommit === null) {
      return true;
    }

    return meta.lastIndexedCommit === currentCommit;
  }

  async discoverGraph(
    filterPatterns: string[] = [],
    disabledPlugins: Set<string> = new Set(),
    signal?: AbortSignal,
  ): Promise<IGraphData> {
    this._syncPluginOrder();
    const workspaceRoot = this._getWorkspaceRoot();
    if (!workspaceRoot) {
      console.log('[CodeGraphy] No workspace folder open');
      return { nodes: [], edges: [] };
    }

    const config = this._config.getAll();
    const discoveryDependencies: WorkspacePipelineDiscoveryDependencies<IDiscoveredFile> = {
      discover: async options => {
        const result = await this._discovery.discover(options);
        const discoveryResult: WorkspacePipelineDiscoveryResult<IDiscoveredFile> = {
          durationMs: result.durationMs,
          files: result.files,
          limitReached: result.limitReached,
          totalFound: result.totalFound ?? result.files.length,
        };
        return discoveryResult;
      },
    };
    const discoveryResult = await discoverWorkspacePipelineFiles(
      discoveryDependencies,
      workspaceRoot,
      config,
      filterPatterns,
      this.getPluginFilterPatterns(),
      signal,
    );

    if (discoveryResult.limitReached) {
      vscode.window.showWarningMessage(
        formatWorkspacePipelineLimitReachedMessage(
          discoveryResult.totalFound,
          config.maxFiles,
        ),
      );
    }

    const fileConnections = new Map<string, IProjectedConnection[]>(
      discoveryResult.files.map((file: IDiscoveredFile) => [file.relativePath, []]),
    );

    this._lastDiscoveredFiles = discoveryResult.files;
    this._lastFileAnalysis = new Map();
    this._lastFileConnections = fileConnections;
    this._lastWorkspaceRoot = workspaceRoot;

    return this._buildGraphData(
      fileConnections,
      workspaceRoot,
      config.showOrphans,
      disabledPlugins,
    );
  }

  /**
   * Analyzes the workspace and returns graph data.
   * Uses caching for performance.
   */
  async analyze(
    filterPatterns: string[] = [],
    disabledPlugins: Set<string> = new Set(),
    signal?: AbortSignal,
    onProgress?: (progress: { phase: string; current: number; total: number }) => void,
  ): Promise<IGraphData> {
    this._syncPluginOrder();
    const graphData = await runWorkspacePipelineAnalysis(
      createWorkspacePipelineAnalysisSource(
        this as unknown as WorkspacePipelineSourceOwner,
      ),
      this._cache,
      this._config,
      this._discovery,
      () => this._getWorkspaceRoot(),
      filterPatterns,
      disabledPlugins,
      onProgress,
      signal,
    );

    const workspaceRoot = this._getWorkspaceRoot();
    if (workspaceRoot) {
      try {
        const meta = readCodeGraphyRepoMeta(workspaceRoot);
        writeCodeGraphyRepoMeta(workspaceRoot, {
          ...meta,
          lastIndexedAt: new Date().toISOString(),
          lastIndexedCommit: await this._getCurrentCommitSha(workspaceRoot),
          pluginSignature: this._getPluginSignature(),
          settingsSignature: this._getSettingsSignature(),
        });
      } catch (error) {
        console.warn('[CodeGraphy] Failed to update repo index metadata.', error);
      }
    }

    return graphData;
  }

  /**
   * Rebuilds graph data from cached connections without re-analyzing files.
   * Used for instant graph updates when toggling sources/plugins.
   */
  rebuildGraph(disabledPlugins: Set<string>, showOrphans: boolean): IGraphData {
    this._syncPluginOrder();
    return rebuildWorkspacePipelineGraphForSource(
      createWorkspacePipelineRebuildSource(
        this as unknown as WorkspacePipelineSourceOwner,
      ),
      disabledPlugins,
      showOrphans,
    );
  }

  async refreshIndex(
    filterPatterns: string[] = [],
    disabledPlugins: Set<string> = new Set(),
    signal?: AbortSignal,
    onProgress?: (progress: { phase: string; current: number; total: number }) => void,
  ): Promise<IGraphData> {
    this.clearCache();
    return this.analyze(filterPatterns, disabledPlugins, signal, progress => {
      onProgress?.({
        ...progress,
        phase: 'Refreshing Index',
      });
    });
  }

  async refreshChangedFiles(
    filePaths: readonly string[],
    filterPatterns: string[] = [],
    disabledPlugins: Set<string> = new Set(),
    signal?: AbortSignal,
    onProgress?: (progress: { phase: string; current: number; total: number }) => void,
  ): Promise<IGraphData> {
    this.invalidateWorkspaceFiles(filePaths);
    return this.analyze(filterPatterns, disabledPlugins, signal, progress => {
      onProgress?.({
        ...progress,
        phase: 'Applying Changes',
      });
    });
  }

  /**
   * Computes the status of each registered plugin for the webview's Plugins panel.
   */
  getPluginStatuses(disabledPlugins: Set<string>): IPluginStatus[] {
    this._syncPluginOrder();
    return getWorkspacePipelinePluginStatuses({
      disabledPlugins,
      discoveredFiles: this._lastDiscoveredFiles,
      fileConnections: this._lastFileConnections,
      registry: this._registry,
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
      this._getWorkspaceRoot(),
      message => {
        console.log(message);
      },
    );
  }

  invalidateWorkspaceFiles(filePaths: readonly string[]): string[] {
    const workspaceRoot = this._getWorkspaceRoot();
    if (!workspaceRoot || filePaths.length === 0) {
      return [];
    }

    const invalidated = new Set<string>();

    for (const filePath of filePaths) {
      const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.join(workspaceRoot, filePath);
      const relativePath = path.relative(workspaceRoot, absolutePath).replace(/\\/g, '/');

      if (!relativePath || relativePath.startsWith('..')) {
        continue;
      }

      delete this._cache.files[relativePath];
      this._lastFileAnalysis.delete(relativePath);
      this._lastFileConnections.delete(relativePath);
      invalidated.add(relativePath);
    }

    if (invalidated.size > 0) {
      this._persistCache();
    }

    return [...invalidated];
  }

  invalidatePluginFiles(pluginIds: readonly string[]): string[] {
    if (pluginIds.length === 0 || this._lastDiscoveredFiles.length === 0) {
      return [];
    }

    const selectedPluginIds = new Set(pluginIds);
    const pluginInfos = this._registry
      .list()
      .filter(({ plugin }) => selectedPluginIds.has(plugin.id));
    if (pluginInfos.length === 0) {
      return [];
    }

    const invalidateAllFiles = pluginInfos.some(({ plugin }) => plugin.supportedExtensions.includes('*'));
    const absolutePaths = invalidateAllFiles
      ? this._lastDiscoveredFiles.map(file => path.join(this._lastWorkspaceRoot, file.relativePath))
      : this._lastDiscoveredFiles
        .filter((file) => {
          const extension = path.extname(file.relativePath).toLowerCase();
          return pluginInfos.some(({ plugin }) => plugin.supportedExtensions.includes(extension));
        })
        .map(file => path.join(this._lastWorkspaceRoot, file.relativePath));

    return this.invalidateWorkspaceFiles(absolutePaths);
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
    await preAnalyzeWorkspacePipelineFiles(
      files,
      workspaceRoot,
      {
        notifyPreAnalyze: async (v2Files, rootPath) => {
          await this._registry.notifyPreAnalyze(v2Files, rootPath);
        },
        readContent: file => this._discovery.readContent(file),
      },
      signal,
    );
  }

  /**
   * Analyzes discovered files, using cache where possible.
   */
  protected async _analyzeFiles(
    files: IDiscoveredFile[],
    workspaceRoot: string,
    onProgress?: (progress: { current: number; total: number; filePath: string }) => void,
    signal?: AbortSignal
  ): Promise<IWorkspaceFileAnalysisResult> {
    return analyzeWorkspacePipelineFiles(
      this._cache,
      this._discovery,
      this._eventBus,
      this._registry,
      (filePath: string) => this._getFileStat(filePath),
      files,
      workspaceRoot,
      onProgress,
      signal,
    );
  }

  /**
   * Builds graph data from file connections.
   */
  protected _buildGraphData(
    fileConnections: Map<string, IProjectedConnection[]>,
    workspaceRoot: string,
    showOrphans: boolean,
    disabledPlugins: Set<string> = new Set()
  ): IGraphData {
    return buildWorkspacePipelineGraphData(
      this._cache,
      this._context,
      this._registry,
      fileConnections,
      workspaceRoot,
      showOrphans,
      disabledPlugins,
    );
  }

  protected _buildGraphDataFromAnalysis(
    fileAnalysis: Map<string, IFileAnalysisResult>,
    workspaceRoot: string,
    showOrphans: boolean,
    disabledPlugins: Set<string> = new Set(),
  ): IGraphData {
    return this._buildGraphData(
      projectConnectionMapFromFileAnalysis(fileAnalysis),
      workspaceRoot,
      showOrphans,
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

  private _syncPluginOrder(): void {
    this._registry.setPluginOrder(this._config.getAll().pluginOrder);
  }

  private _getPluginSignature(): string | null {
    return createCodeGraphyPluginSignature(
      this._registry.list().map(({ plugin }) => ({
        plugin: {
          id: plugin.id,
          version: plugin.version,
        },
      })),
    );
  }

  private _getSettingsSignature(): string {
    return createCodeGraphySettingsSignature(this._config.getAll());
  }

  private async _getCurrentCommitSha(workspaceRoot: string): Promise<string | null> {
    try {
      return (await execGitCommand(['rev-parse', 'HEAD'], { workspaceRoot })).trim();
    } catch {
      return null;
    }
  }

  private _getCurrentCommitShaSync(workspaceRoot: string): string | null {
    try {
      return execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: workspaceRoot,
        encoding: 'utf8',
      }).trim();
    } catch {
      return null;
    }
  }

  private _persistCache(): void {
    const workspaceRoot = this._getWorkspaceRoot();
    if (!workspaceRoot) {
      return;
    }

    try {
      saveWorkspaceAnalysisDatabaseCache(workspaceRoot, this._cache);
    } catch (error) {
      console.warn('[CodeGraphy] Failed to persist repo-local analysis cache.', error);
    }
  }
}
