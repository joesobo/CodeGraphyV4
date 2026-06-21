import * as path from 'node:path';
import * as vscode from 'vscode';
import {
  type IDiscoveredFile,
  projectFileAnalysisConnections,
  readCodeGraphyWorkspaceStatus,
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

function createCachedDiscoveredFiles(
  workspaceRoot: string,
  filePaths: readonly string[],
): IDiscoveredFile[] {
  return filePaths.map(relativePath => ({
    absolutePath: path.join(workspaceRoot, relativePath),
    extension: path.extname(relativePath),
    name: path.basename(relativePath),
    relativePath,
  }));
}

function collectCachedDirectoryPaths(filePaths: readonly string[]): string[] {
  const directories = new Set<string>();

  for (const filePath of filePaths) {
    let directory = path.posix.dirname(filePath.replace(/\\/g, '/'));
    while (directory && directory !== '.') {
      directories.add(directory);
      directory = path.posix.dirname(directory);
    }
  }

  return [...directories].sort();
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
  ): Promise<IGraphData> {
    throwIfWorkspaceAnalysisAborted(signal);
    await this._hydrateCacheFromGraphCache();
    throwIfWorkspaceAnalysisAborted(signal);

    const workspaceRoot = this._getWorkspaceRoot();
    if (!workspaceRoot) {
      return { nodes: [], edges: [] };
    }

    const config = this._config.getAll();
    const discoveryResult = await discoverWorkspacePipelineFilesWithWarnings(
      createWorkspacePipelineDiscoveryDependencies(this._discovery),
      workspaceRoot,
      config,
      this._getEffectiveCustomFilterPatterns(_filterPatterns),
      this._getEffectivePluginFilterPatterns(disabledPlugins),
      signal,
      message => {
        vscode.window.showWarningMessage(message);
      },
    );
    throwIfWorkspaceAnalysisAborted(signal);

    const fileAnalysis = new Map(
      Object.entries(this._cache.files).map(([filePath, entry]) => [
        filePath,
        entry.analysis,
      ]),
    );
    const cachedFilePaths = Object.keys(this._cache.files);

    this._lastDiscoveredFiles = createCachedDiscoveredFiles(workspaceRoot, cachedFilePaths);
    this._lastDiscoveredDirectories = discoveryResult.directories
      ?? collectCachedDirectoryPaths(cachedFilePaths);
    this._lastGitIgnoredPaths = discoveryResult.gitIgnoredPaths ?? [];
    this._lastFileAnalysis = fileAnalysis;
    this._lastFileConnections = projectFileAnalysisConnections(fileAnalysis, workspaceRoot);
    this._lastWorkspaceRoot = workspaceRoot;

    throwIfWorkspaceAnalysisAborted(signal);

    return this._buildGraphDataFromAnalysis(
      fileAnalysis,
      workspaceRoot,
      config.showOrphans,
      disabledPlugins,
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
