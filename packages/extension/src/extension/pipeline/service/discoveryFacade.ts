import * as vscode from 'vscode';
import {
  createWorkspacePluginAnalysisContext,
  type IDiscoveredFile,
  projectFileAnalysisConnections,
  readCodeGraphyWorkspaceStatus,
  SYMBOLS_ANALYSIS_CACHE_TIER,
  throwIfWorkspaceAnalysisAborted,
} from '@codegraphy-dev/core';
import type { IProjectedConnection } from '../../../core/plugins/types/contracts';
import type { IGraphData } from '../../../shared/graph/contracts';
import type { IPluginFilterPatternGroup } from '../../../shared/protocol/extensionToWebview';
import {
  getWorkspacePipelinePluginFilterGroups,
  getWorkspacePipelinePluginFilterPatterns,
  initializeWorkspacePipeline,
  syncWorkspacePipelinePlugins,
} from '../plugins/bootstrap';
import type { WorkspacePipelineSourceOwner } from '../analysisSource';
import { WorkspacePipelineInternalBase } from './base/internal';
import {
  createWorkspacePipelineDiscoveryDependencies,
  discoverWorkspacePipelineFilesWithWarnings,
} from './runtime/discovery';
import { hasWorkspacePipelineIndex } from './cache/index';
import {
  analyzeWorkspacePipeline,
  rebuildWorkspacePipelineGraph,
} from './runtime/run';
import { createEmptyWorkspaceAnalysisCache } from '../cache';
import { createCachedWorkspaceDiscoveryState } from './cache/cachedDiscovery';
import { recordExtensionPerformanceEvent } from '../../performance/marks';
import { createWorkspacePipelineAnalysisCacheTiers } from './cache/tiers';

export interface WorkspacePipelineCachedGraphLoadOptions {
  includeCurrentGitignoreMetadata?: boolean;
  warmAnalysis?: boolean;
}

function isWorkspaceAnalysisAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function isMissingFileError(error: unknown): boolean {
  return error instanceof Error
    && 'code' in error
    && (error as { code?: unknown }).code === 'ENOENT';
}

const CACHED_GRAPH_ANALYSIS_WARMUP_IGNORED_SEGMENTS = new Set([
  '.codegraphy',
  '.git',
  '.stryker-tmp',
  '.turbo',
  '.worktrees',
  'coverage',
  'dist',
  'node_modules',
  'out',
  'reports',
]);

function isCachedGraphAnalysisWarmupCandidate(file: IDiscoveredFile): boolean {
  const segments = file.relativePath.replace(/\\/g, '/').split('/');
  return !segments.some(segment => CACHED_GRAPH_ANALYSIS_WARMUP_IGNORED_SEGMENTS.has(segment));
}

export abstract class WorkspacePipelineDiscoveryFacade extends WorkspacePipelineInternalBase {
  private _workspacePluginReloadQueue: Promise<void> = Promise.resolve();

  async initialize(): Promise<void> {
    await initializeWorkspacePipeline(this._registry, {
      getWorkspaceRoot: () => this._getWorkspaceRoot(),
    });

    console.log('[CodeGraphy] WorkspacePipeline initialized');
  }

  async reloadWorkspacePlugins(): Promise<void> {
    const reload = this._workspacePluginReloadQueue.then(async () => {
      this._registry.disposeAll();
      await this.initialize();
    });
    this._workspacePluginReloadQueue = reload.catch(() => undefined);
    return reload;
  }

  async syncWorkspacePlugins(): Promise<void> {
    const sync = this._workspacePluginReloadQueue.then(async () => {
      await syncWorkspacePipelinePlugins(this._registry, {
        getWorkspaceRoot: () => this._getWorkspaceRoot(),
      });
    });
    this._workspacePluginReloadQueue = sync.catch(() => undefined);
    return sync;
  }

  getPluginFilterPatterns(
    disabledPlugins: ReadonlySet<string> = new Set(),
  ): string[] {
    return getWorkspacePipelinePluginFilterPatterns(this._registry, disabledPlugins);
  }

  getPluginFilterGroups(
    disabledPlugins: ReadonlySet<string> = new Set(),
  ): IPluginFilterPatternGroup[] {
    return getWorkspacePipelinePluginFilterGroups(this._registry, disabledPlugins);
  }

  private _getEffectiveCustomFilterPatterns(filterPatterns: string[]): string[] {
    const disabledPatterns = new Set(this._config.disabledCustomFilterPatterns);
    return filterPatterns.filter(pattern => !disabledPatterns.has(pattern));
  }

  private _getEffectivePluginFilterPatterns(disabledPlugins: ReadonlySet<string>): string[] {
    const disabledPatterns = new Set(this._config.disabledPluginFilterPatterns);
    return this.getPluginFilterPatterns(disabledPlugins)
      .filter(pattern => !disabledPatterns.has(pattern));
  }

  hasIndex(): boolean {
    return hasWorkspacePipelineIndex(this._getWorkspaceRoot());
  }

  getIndexStatus(): { freshness: 'fresh' | 'stale' | 'missing'; detail: string } {
    const workspaceRoot = this._getWorkspaceRoot();
    if (!workspaceRoot) {
      return {
        freshness: 'missing',
        detail: 'CodeGraphy index is missing. Index the workspace to build the graph.',
      };
    }

    if (!this.hasIndex()) {
      return {
        freshness: 'missing',
        detail: 'CodeGraphy index is missing. Index the workspace to build the graph.',
      };
    }

    const status = readCodeGraphyWorkspaceStatus(workspaceRoot, {
      pluginSignature: this._getPluginSignature(),
      settingsSignature: this._getSettingsSignature(),
    });

    return {
      freshness: status.state,
      detail: status.detail,
    };
  }

  async discoverGraph(
    filterPatterns: string[] = [],
    disabledPlugins: Set<string> = new Set(),
    signal?: AbortSignal,
  ): Promise<IGraphData> {
    const workspaceRoot = this._getWorkspaceRoot();
    if (!workspaceRoot) {
      console.log('[CodeGraphy] No workspace folder open');
      return { nodes: [], edges: [] };
    }

    const config = this._config.getAll();
    const discoveryResult = await discoverWorkspacePipelineFilesWithWarnings(
      createWorkspacePipelineDiscoveryDependencies(this._discovery),
      workspaceRoot,
      config,
      this._getEffectiveCustomFilterPatterns(filterPatterns),
      this._getEffectivePluginFilterPatterns(disabledPlugins),
      signal,
      message => {
        vscode.window.showWarningMessage(message);
      },
    );
    const fileConnections = new Map<string, IProjectedConnection[]>(
      discoveryResult.files.map(file => [file.relativePath, []]),
    );

    this._lastDiscoveredDirectories = discoveryResult.directories ?? [];
    this._lastDiscoveredFiles = discoveryResult.files;
    this._lastGitIgnoredPaths = discoveryResult.gitIgnoredPaths ?? [];
    this._lastFileAnalysis = new Map();
    this._lastFileConnections = fileConnections;
    this._lastWorkspaceRoot = workspaceRoot;

    return this._buildGraphData(
      fileConnections,
      workspaceRoot,
      true,
      disabledPlugins,
    );
  }

  async analyze(
    filterPatterns: string[] = [],
    disabledPlugins: Set<string> = new Set(),
    signal?: AbortSignal,
    onProgress?: (progress: { phase: string; current: number; total: number }) => void,
  ): Promise<IGraphData> {
    return analyzeWorkspacePipeline(
      this as unknown as WorkspacePipelineSourceOwner,
      this._cache,
      this._config,
      this._discovery,
      () => this._getWorkspaceRoot(),
      this._getEffectiveCustomFilterPatterns(filterPatterns),
      disabledPlugins,
      onProgress,
      signal,
      async () => this._persistIndexMetadata(),
    );
  }

  async loadCachedGraph(
    _filterPatterns: string[] = [],
    disabledPlugins: Set<string> = new Set(),
    signal?: AbortSignal,
    options: WorkspacePipelineCachedGraphLoadOptions = {},
  ): Promise<IGraphData> {
    const loadStartedAt = Date.now();
    throwIfWorkspaceAnalysisAborted(signal);
    let stageStartedAt = Date.now();
    await this._hydrateCacheFromGraphCache();
    recordExtensionPerformanceEvent('workspacePipeline.loadCachedGraph.hydrate', {
      durationMs: Date.now() - stageStartedAt,
      fileCount: Object.keys(this._cache.files).length,
    });
    throwIfWorkspaceAnalysisAborted(signal);

    const workspaceRoot = this._getWorkspaceRoot();
    if (!workspaceRoot) {
      return { nodes: [], edges: [] };
    }

    const config = this._config.getAll();
    stageStartedAt = Date.now();
    throwIfWorkspaceAnalysisAborted(signal);

    const fileAnalysis = new Map(
      Object.entries(this._cache.files).map(([filePath, entry]) => [
        filePath,
        entry.analysis,
      ]),
    );
    const cachedFilePaths = Object.keys(this._cache.files);
    recordExtensionPerformanceEvent('workspacePipeline.loadCachedGraph.cacheSnapshot', {
      durationMs: Date.now() - stageStartedAt,
      fileCount: cachedFilePaths.length,
    });
    stageStartedAt = Date.now();
    const includeCurrentGitignoreMetadata = options.includeCurrentGitignoreMetadata !== false;
    const cachedDiscovery = createCachedWorkspaceDiscoveryState(
      workspaceRoot,
      cachedFilePaths,
      config.respectGitignore && includeCurrentGitignoreMetadata,
    );
    recordExtensionPerformanceEvent('workspacePipeline.loadCachedGraph.cachedDiscovery', {
      directoryCount: cachedDiscovery.directories.length,
      durationMs: Date.now() - stageStartedAt,
      fileCount: cachedDiscovery.files.length,
      gitIgnoredPathCount: cachedDiscovery.gitIgnoredPaths.length,
      includeCurrentGitignoreMetadata,
    });

    this._lastDiscoveredFiles = cachedDiscovery.files;
    this._lastDiscoveredDirectories = cachedDiscovery.directories;
    this._lastGitIgnoredPaths = cachedDiscovery.gitIgnoredPaths;
    this._lastFileAnalysis = fileAnalysis;
    this._lastFileConnections = projectFileAnalysisConnections(fileAnalysis, workspaceRoot);
    this._lastWorkspaceRoot = workspaceRoot;

    throwIfWorkspaceAnalysisAborted(signal);

    stageStartedAt = Date.now();
    const graphData = this._buildGraphDataFromAnalysis(
      fileAnalysis,
      workspaceRoot,
      config.showOrphans,
      disabledPlugins,
    );
    recordExtensionPerformanceEvent('workspacePipeline.loadCachedGraph.buildGraph', {
      durationMs: Date.now() - stageStartedAt,
      edgeCount: graphData.edges.length,
      nodeCount: graphData.nodes.length,
    });
    recordExtensionPerformanceEvent('workspacePipeline.loadCachedGraph.completed', {
      durationMs: Date.now() - loadStartedAt,
      edgeCount: graphData.edges.length,
      nodeCount: graphData.nodes.length,
    });

    if (options.warmAnalysis !== false) {
      this._scheduleCachedGraphAnalysisWarmup(
        cachedDiscovery.files,
        workspaceRoot,
        disabledPlugins,
        signal,
      );
    }

    return graphData;
  }

  private _selectCachedGraphAnalysisWarmupFile(
    files: readonly IDiscoveredFile[],
  ): IDiscoveredFile | undefined {
    if (typeof this._registry.supportsFile !== 'function') {
      return files[0];
    }

    const sourceFiles = files.filter(isCachedGraphAnalysisWarmupCandidate);
    const supportedFiles = sourceFiles.filter(file =>
      this._registry.supportsFile(file.absolutePath)
      || this._registry.supportsFile(file.relativePath),
    );
    if (supportedFiles.length === 0) {
      return files.find(file =>
        this._registry.supportsFile(file.absolutePath)
        || this._registry.supportsFile(file.relativePath),
      ) ?? files[0];
    }

    const extensionStats = new Map<string, {
      count: number;
      file: IDiscoveredFile;
      firstIndex: number;
    }>();
    for (const [index, file] of supportedFiles.entries()) {
      const extension = file.extension;
      const stats = extensionStats.get(extension);
      if (stats) {
        stats.count += 1;
        continue;
      }

      extensionStats.set(extension, {
        count: 1,
        file,
        firstIndex: index,
      });
    }

    return [...extensionStats.values()]
      .sort((left, right) =>
        right.count - left.count || left.firstIndex - right.firstIndex,
      )[0]?.file;
  }

  private _scheduleCachedGraphAnalysisWarmup(
    files: readonly IDiscoveredFile[],
    workspaceRoot: string,
    disabledPlugins: Set<string>,
    signal?: AbortSignal,
  ): void {
    if (typeof this._registry.analyzeFileResultForPlugins !== 'function') {
      return;
    }

    const file = this._selectCachedGraphAnalysisWarmupFile(files);
    if (!file) {
      return;
    }

    const warmupStartedAt = Date.now();
    const disabledPluginSnapshot = new Set(disabledPlugins);
    const pluginIds = this._getActiveAnalysisPluginIds(undefined, disabledPluginSnapshot);
    const cacheTiers = createWorkspacePipelineAnalysisCacheTiers(
      this._config.get<Record<string, boolean>>('nodeVisibility', {}) ?? {},
      pluginIds,
    );
    const analysisContext = createWorkspacePluginAnalysisContext(workspaceRoot, {
      features: {
        symbols: cacheTiers.active === undefined
          || cacheTiers.active.includes(SYMBOLS_ANALYSIS_CACHE_TIER),
      },
    });

    void (async () => {
      throwIfWorkspaceAnalysisAborted(signal);
      const content = await this._discovery.readContent(file);
      throwIfWorkspaceAnalysisAborted(signal);
      await this._registry.analyzeFileResultForPlugins(
        file.absolutePath,
        content,
        workspaceRoot,
        pluginIds,
        analysisContext,
        { disabledPlugins: disabledPluginSnapshot },
      );
      recordExtensionPerformanceEvent('workspacePipeline.loadCachedGraph.warmAnalysis', {
        durationMs: Date.now() - warmupStartedAt,
        filePath: file.relativePath,
        pluginIdCount: pluginIds.length,
        status: 'completed',
      });
    })().catch(error => {
      const status = isWorkspaceAnalysisAbortError(error)
        ? 'aborted'
        : isMissingFileError(error)
          ? 'skipped'
          : 'failed';
      recordExtensionPerformanceEvent('workspacePipeline.loadCachedGraph.warmAnalysis', {
        durationMs: Date.now() - warmupStartedAt,
        filePath: file.relativePath,
        pluginIdCount: pluginIds.length,
        status,
      });

      if (status === 'failed') {
        console.warn('[CodeGraphy] Failed to warm cached graph analysis.', error);
      }
    });
  }

  rebuildGraph(disabledPlugins: Set<string>, showOrphans: boolean): IGraphData {
    return rebuildWorkspacePipelineGraph(
      this as unknown as WorkspacePipelineSourceOwner,
      disabledPlugins,
      showOrphans,
    );
  }

  protected resetCacheForIndexRefresh(): void {
    this._cache = createEmptyWorkspaceAnalysisCache();
    console.log('[CodeGraphy] Cache cleared');
  }

  async refreshIndex(
    filterPatterns: string[] = [],
    disabledPlugins: Set<string> = new Set(),
    signal?: AbortSignal,
    onProgress?: (progress: { phase: string; current: number; total: number }) => void,
  ): Promise<IGraphData> {
    this.resetCacheForIndexRefresh();
    return this.analyze(filterPatterns, disabledPlugins, signal, progress => {
      onProgress?.({
        ...progress,
        phase: progress.phase || 'Refreshing Index',
      });
    });
  }

  abstract clearCache(): void;
}
