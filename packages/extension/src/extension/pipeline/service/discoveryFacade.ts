import * as vscode from 'vscode';
import {
  type IDiscoveredFile,
  projectFileAnalysisConnections,
  throwIfWorkspaceAnalysisAborted,
} from '@codegraphy-dev/core';
import type { IProjectedConnection } from '../../../core/plugins/types/contracts';
import type { IGraphData } from '../../../shared/graph/contracts';
import type { IPluginFilterPatternGroup } from '../../../shared/protocol/extensionToWebview';
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
import {
  createCachedGraphAnalysisWarmupInput,
  isMissingFileError,
  isWorkspaceAnalysisAbortError,
  warmCachedGraphAnalysisFile,
} from './cachedGraphWarmup';
import { getWorkspacePipelineIndexStatus } from './indexStatus';
import {
  getEffectiveCustomFilterPatterns,
  getEffectivePluginFilterPatterns,
  getPipelinePluginFilterGroups,
  getPipelinePluginFilterPatterns,
  initializeWorkspacePipelinePlugins,
  queueWorkspacePipelinePluginReload,
  queueWorkspacePipelinePluginSync,
} from './pluginState';

export interface WorkspacePipelineCachedGraphLoadOptions {
  includeCurrentGitignoreMetadata?: boolean;
  warmAnalysis?: boolean;
}

export abstract class WorkspacePipelineDiscoveryFacade extends WorkspacePipelineInternalBase {
  private _workspacePluginReloadQueue: Promise<void> = Promise.resolve();

  async initialize(): Promise<void> {
    await initializeWorkspacePipelinePlugins(this._registry, () => this._getWorkspaceRoot());

    console.log('[CodeGraphy] WorkspacePipeline initialized');
  }

  async reloadWorkspacePlugins(): Promise<void> {
    const { reload, nextQueue } = queueWorkspacePipelinePluginReload(
      this._workspacePluginReloadQueue,
      this._registry,
      () => this.initialize(),
    );
    this._workspacePluginReloadQueue = nextQueue;
    return reload;
  }

  async syncWorkspacePlugins(): Promise<void> {
    const { sync, nextQueue } = queueWorkspacePipelinePluginSync(
      this._workspacePluginReloadQueue,
      this._registry,
      () => this._getWorkspaceRoot(),
    );
    this._workspacePluginReloadQueue = nextQueue;
    return sync;
  }

  getPluginFilterPatterns(
    disabledPlugins: ReadonlySet<string> = new Set(),
  ): string[] {
    return getPipelinePluginFilterPatterns(this._registry, disabledPlugins);
  }

  getPluginFilterGroups(
    disabledPlugins: ReadonlySet<string> = new Set(),
  ): IPluginFilterPatternGroup[] {
    return getPipelinePluginFilterGroups(this._registry, disabledPlugins);
  }

  private _getEffectiveCustomFilterPatterns(filterPatterns: string[]): string[] {
    return getEffectiveCustomFilterPatterns(this._config, filterPatterns);
  }

  private _getEffectivePluginFilterPatterns(disabledPlugins: ReadonlySet<string>): string[] {
    return getEffectivePluginFilterPatterns(this._registry, this._config, disabledPlugins);
  }

  hasIndex(): boolean {
    return hasWorkspacePipelineIndex(this._getWorkspaceRoot());
  }

  getIndexStatus(): { freshness: 'fresh' | 'stale' | 'missing'; detail: string } {
    return getWorkspacePipelineIndexStatus({
      hasIndex: () => this.hasIndex(),
      pluginSignature: this._getPluginSignature(),
      settingsSignature: this._getSettingsSignature(),
      workspaceRoot: this._getWorkspaceRoot(),
    });
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

  private _scheduleCachedGraphAnalysisWarmup(
    files: readonly IDiscoveredFile[],
    workspaceRoot: string,
    disabledPlugins: Set<string>,
    signal?: AbortSignal,
  ): void {
    const input = createCachedGraphAnalysisWarmupInput({
      disabledPlugins,
      files,
      getActiveAnalysisPluginIds: disabledPluginSnapshot =>
        this._getActiveAnalysisPluginIds(undefined, disabledPluginSnapshot),
      nodeVisibility: this._config.get<Record<string, boolean>>('nodeVisibility', {}) ?? {},
      registry: this._registry,
      signal,
      workspaceRoot,
    });
    if (!input) {
      return;
    }

    void warmCachedGraphAnalysisFile(input, this._discovery, this._registry).catch(error => {
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
