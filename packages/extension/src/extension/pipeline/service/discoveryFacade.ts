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
import { createWorkspacePipelineAnalysisCacheTiers } from './cache/tiers';

export interface WorkspacePipelineCachedGraphLoadOptions {
  includeCurrentGitignoreMetadata?: boolean;
  warmAnalysis?: boolean;
}

interface CachedGraphAnalysisWarmupInput {
  analysisContext: ReturnType<typeof createWorkspacePluginAnalysisContext>;
  disabledPluginSnapshot: Set<string>;
  file: IDiscoveredFile;
  pluginIds: readonly string[];
  signal?: AbortSignal;
  workspaceRoot: string;
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

function selectMostRepresentedCachedGraphWarmupFile(
  files: readonly IDiscoveredFile[],
): IDiscoveredFile | undefined {
  const extensionStats = new Map<string, {
    count: number;
    file: IDiscoveredFile;
    firstIndex: number;
  }>();

  for (const [index, file] of files.entries()) {
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
    .sort((left, right) => right.count - left.count || left.firstIndex - right.firstIndex)[0]
    ?.file;
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
    throwIfWorkspaceAnalysisAborted(signal);
    await this._hydrateCacheFromGraphCache();
    throwIfWorkspaceAnalysisAborted(signal);

    const workspaceRoot = this._getWorkspaceRoot();
    if (!workspaceRoot) {
      return { nodes: [], edges: [] };
    }

    const config = this._config.getAll();
    throwIfWorkspaceAnalysisAborted(signal);

    const fileAnalysis = new Map(
      Object.entries(this._cache.files).map(([filePath, entry]) => [
        filePath,
        entry.analysis,
      ]),
    );
    const cachedFilePaths = Object.keys(this._cache.files);
    const includeCurrentGitignoreMetadata = options.includeCurrentGitignoreMetadata !== false;
    const cachedDiscovery = createCachedWorkspaceDiscoveryState(
      workspaceRoot,
      cachedFilePaths,
      config.respectGitignore && includeCurrentGitignoreMetadata,
    );

    this._lastDiscoveredFiles = cachedDiscovery.files;
    this._lastDiscoveredDirectories = cachedDiscovery.directories;
    this._lastGitIgnoredPaths = cachedDiscovery.gitIgnoredPaths;
    this._lastFileAnalysis = fileAnalysis;
    this._lastFileConnections = projectFileAnalysisConnections(fileAnalysis, workspaceRoot);
    this._lastWorkspaceRoot = workspaceRoot;

    throwIfWorkspaceAnalysisAborted(signal);

    const graphData = this._buildGraphDataFromAnalysis(
      fileAnalysis,
      workspaceRoot,
      config.showOrphans,
      disabledPlugins,
    );

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

    const supportedFiles = this._getSupportedCachedGraphAnalysisWarmupFiles(
      files.filter(isCachedGraphAnalysisWarmupCandidate),
    );
    if (supportedFiles.length === 0) {
      return this._getSupportedCachedGraphAnalysisWarmupFiles(files)[0] ?? files[0];
    }

    return selectMostRepresentedCachedGraphWarmupFile(supportedFiles);
  }

  private _getSupportedCachedGraphAnalysisWarmupFiles(
    files: readonly IDiscoveredFile[],
  ): IDiscoveredFile[] {
    return files.filter(file =>
      this._registry.supportsFile?.(file.absolutePath)
      || this._registry.supportsFile?.(file.relativePath),
    );
  }

  private _scheduleCachedGraphAnalysisWarmup(
    files: readonly IDiscoveredFile[],
    workspaceRoot: string,
    disabledPlugins: Set<string>,
    signal?: AbortSignal,
  ): void {
    const input = this._createCachedGraphAnalysisWarmupInput(
      files,
      workspaceRoot,
      disabledPlugins,
      signal,
    );
    if (!input) {
      return;
    }

    void this._warmCachedGraphAnalysisFile(input).catch(error => {
      const status = isWorkspaceAnalysisAbortError(error)
        ? 'aborted'
        : isMissingFileError(error)
          ? 'skipped'
          : 'failed';

      if (status === 'failed') {
        console.warn('[CodeGraphy] Failed to warm cached graph analysis.', error);
      }
    });
  }

  private _createCachedGraphAnalysisWarmupInput(
    files: readonly IDiscoveredFile[],
    workspaceRoot: string,
    disabledPlugins: Set<string>,
    signal?: AbortSignal,
  ): CachedGraphAnalysisWarmupInput | undefined {
    if (typeof this._registry.analyzeFileResultForPlugins !== 'function') {
      return undefined;
    }

    const file = this._selectCachedGraphAnalysisWarmupFile(files);
    if (!file) {
      return undefined;
    }

    const disabledPluginSnapshot = new Set(disabledPlugins);
    const pluginIds = this._getActiveAnalysisPluginIds(undefined, disabledPluginSnapshot);
    const cacheTiers = createWorkspacePipelineAnalysisCacheTiers(
      this._config.get<Record<string, boolean>>('nodeVisibility', {}) ?? {},
      pluginIds,
    );

    return {
      analysisContext: createWorkspacePluginAnalysisContext(workspaceRoot, {
        features: {
          symbols: cacheTiers.active === undefined
            || cacheTiers.active.includes(SYMBOLS_ANALYSIS_CACHE_TIER),
        },
      }),
      disabledPluginSnapshot,
      file,
      pluginIds,
      signal,
      workspaceRoot,
    };
  }

  private async _warmCachedGraphAnalysisFile(input: CachedGraphAnalysisWarmupInput): Promise<void> {
    throwIfWorkspaceAnalysisAborted(input.signal);
    const content = await this._discovery.readContent(input.file);
    throwIfWorkspaceAnalysisAborted(input.signal);
    await this._registry.analyzeFileResultForPlugins(
      input.file.absolutePath,
      content,
      input.workspaceRoot,
      input.pluginIds,
      input.analysisContext,
      { disabledPlugins: input.disabledPluginSnapshot },
    );
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
