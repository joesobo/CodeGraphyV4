import fs from 'node:fs';
import path from 'node:path';
import * as vscode from 'vscode';
import {
  hasRequiredAnalysisCacheTiers,
  type IDiscoveredFile,
} from '@codegraphy-dev/core';
import type { IGraphData } from '../../../shared/graph/contracts';
import { WorkspacePipelineDiscoveryFacade } from './discoveryFacade';
import { createWorkspacePipelineAnalysisCacheTiers } from './cache/tiers';
import { getCachedGitHistoryChurnCounts } from '../../gitHistory/cache/state';
import { createGitHistoryPluginSignature } from '../../gitHistory/pluginSignature';
import {
  createWorkspacePipelineDiscoveryDependencies,
  discoverWorkspacePipelineFilesWithWarnings,
} from './runtime/discovery';
import {
  refreshWorkspacePipelineAnalysisScope,
  refreshWorkspacePipelineChangedFiles,
  refreshWorkspacePipelinePluginFiles,
  type WorkspacePipelineRefreshSource,
} from './runtime/refresh';

interface ChangedFileDiscoveryState {
  directories: string[];
  files: IDiscoveredFile[];
}

interface GraphMetricPatchResult {
  changed: boolean;
  node: IGraphData['nodes'][number];
}

function normalizeGraphMetricFilePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

function getGraphMetricNodeFilePath(node: IGraphData['nodes'][number]): string {
  const symbolFilePath = node.symbol?.filePath;
  return normalizeGraphMetricFilePath(
    typeof symbolFilePath === 'string' && symbolFilePath.length > 0
      ? symbolFilePath
      : node.id,
  );
}

export abstract class WorkspacePipelineRefreshFacade extends WorkspacePipelineDiscoveryFacade {
  private _createWorkspaceIndexRefreshSource(
    disabledPlugins: Set<string> = new Set(),
  ): WorkspacePipelineRefreshSource {
    const source = {
      _analyzeFiles: (
        files,
        root,
        progress,
        abortSignal,
        pluginIds,
        nextDisabledPlugins = disabledPlugins,
      ) => this._analyzeFiles(
        files,
        root,
        progress,
        abortSignal,
        pluginIds,
        nextDisabledPlugins,
      ),
      _buildGraphData: (fileConnections, root, selectedPlugins) =>
        this._buildGraphData(fileConnections, root, true, selectedPlugins),
      _buildGraphDataFromAnalysis: (fileAnalysis, root, selectedPlugins) =>
        this._buildGraphDataFromAnalysis(fileAnalysis, root, true, selectedPlugins),
      _patchGraphDataNodeMetrics: (graphData, filePaths) =>
        this._patchGraphDataNodeMetrics(graphData, filePaths),
      _preAnalyzePlugins: (files, root, abortSignal, nextDisabledPlugins = disabledPlugins) =>
        this._preAnalyzePlugins(files, root, abortSignal, nextDisabledPlugins),
      _readAnalysisFiles: files => this._readAnalysisFiles(files),
      analyze: (patterns, selectedPlugins, abortSignal, progress) =>
        this.analyze(patterns, selectedPlugins, abortSignal, progress),
      invalidateWorkspaceFiles: paths => this.invalidateWorkspaceFiles(paths),
    } as WorkspacePipelineRefreshSource;

    Object.defineProperties(source, {
      _lastDiscoveredDirectories: {
        get: () => this._lastDiscoveredDirectories,
        set: (directories: WorkspacePipelineRefreshSource['_lastDiscoveredDirectories']) => {
          this._lastDiscoveredDirectories = directories;
        },
      },
      _lastDiscoveredFiles: {
        get: () => this._lastDiscoveredFiles,
        set: (files: WorkspacePipelineRefreshSource['_lastDiscoveredFiles']) => {
          this._lastDiscoveredFiles = files;
        },
      },
      _lastFileAnalysis: {
        get: () => this._lastFileAnalysis,
        set: (fileAnalysis: WorkspacePipelineRefreshSource['_lastFileAnalysis']) => {
          this._lastFileAnalysis = fileAnalysis;
        },
      },
      _lastFileConnections: {
        get: () => this._lastFileConnections,
        set: (fileConnections: WorkspacePipelineRefreshSource['_lastFileConnections']) => {
          this._lastFileConnections = fileConnections;
        },
      },
      _lastGraphData: {
        get: () => this._lastGraphData,
        set: (graphData: WorkspacePipelineRefreshSource['_lastGraphData']) => {
          this._lastGraphData = graphData;
        },
      },
      _lastWorkspaceRoot: {
        get: () => this._lastWorkspaceRoot,
        set: (root: WorkspacePipelineRefreshSource['_lastWorkspaceRoot']) => {
          this._lastWorkspaceRoot = root;
        },
      },
    });

    return source;
  }

  private _patchGraphDataNodeMetrics(
    graphData: IGraphData,
    filePaths: readonly string[],
  ): IGraphData {
    const metricFilePaths = new Set(filePaths.map(normalizeGraphMetricFilePath));
    if (metricFilePaths.size === 0) {
      return graphData;
    }

    const churnCounts = getCachedGitHistoryChurnCounts(
      this._context.workspaceState,
      createGitHistoryPluginSignature(this._registry),
    ) ?? {};
    let changed = false;
    const nodes = graphData.nodes.map((node) => {
      const result = this._patchGraphDataNodeMetric(node, metricFilePaths, churnCounts);
      changed ||= result.changed;
      return result.node;
    });

    return changed ? { ...graphData, nodes } : graphData;
  }

  private _patchGraphDataNodeMetric(
    node: IGraphData['nodes'][number],
    metricFilePaths: ReadonlySet<string>,
    churnCounts: Record<string, number>,
  ): GraphMetricPatchResult {
    const filePath = getGraphMetricNodeFilePath(node);
    if (!metricFilePaths.has(filePath)) {
      return { changed: false, node };
    }

    const fileSize = this._cache.files[filePath]?.size;
    const churn = churnCounts[filePath] ?? 0;
    if (node.fileSize === fileSize && node.churn === churn) {
      return { changed: false, node };
    }

    return { changed: true, node: { ...node, fileSize, churn } };
  }

  private _canReuseCurrentAnalysisForScope(
    discoveredFiles: readonly IDiscoveredFile[],
    disabledPlugins: Set<string>,
  ): boolean {
    if (discoveredFiles.length === 0) {
      return false;
    }

    const nodeVisibility = this._config.get<Record<string, boolean>>('nodeVisibility', {}) ?? {};
    const activePluginIds = this._getActiveAnalysisPluginIds(undefined, disabledPlugins);
    const requiredTiers = createWorkspacePipelineAnalysisCacheTiers(
      nodeVisibility,
      activePluginIds,
    ).required;

    return discoveredFiles.every((file) => {
      const analysis = this._lastFileAnalysis.get(file.relativePath);
      return Boolean(analysis && hasRequiredAnalysisCacheTiers(analysis, requiredTiers));
    });
  }

  private async _rebuildAnalysisScopeFromCurrentAnalysis(input: {
    discoveredDirectories: readonly string[];
    discoveredFiles: IDiscoveredFile[];
    disabledPlugins: Set<string>;
    onProgress?: (progress: { phase: string; current: number; total: number }) => void;
    showOrphans: boolean;
    workspaceRoot: string;
  }): Promise<IGraphData> {
    input.onProgress?.({
      phase: 'Applying Scope',
      current: 0,
      total: input.discoveredFiles.length,
    });

    this._lastDiscoveredDirectories = [...input.discoveredDirectories];
    this._lastDiscoveredFiles = input.discoveredFiles;
    this._lastWorkspaceRoot = input.workspaceRoot;

    const graphData = this._buildGraphDataFromAnalysis(
      this._lastFileAnalysis,
      input.workspaceRoot,
      input.showOrphans,
      input.disabledPlugins,
    );

    await this._persistIndexMetadata();
    input.onProgress?.({
      phase: 'Applying Scope',
      current: input.discoveredFiles.length,
      total: input.discoveredFiles.length,
    });

    return graphData;
  }

  private _getReusableChangedFileDiscoveryState(
    workspaceRoot: string,
    filePaths: readonly string[],
  ): ChangedFileDiscoveryState | undefined {
    if (!this._hasReusableChangedFileDiscoveryState(workspaceRoot, filePaths)) {
      return undefined;
    }

    const discoveredByRelativePath = this._createDiscoveredFilesByRelativePath();

    for (const filePath of filePaths) {
      if (!this._canReuseChangedFileDiscovery(filePath, workspaceRoot, discoveredByRelativePath)) {
        return undefined;
      }
    }

    return {
      directories: [...this._lastDiscoveredDirectories],
      files: this._lastDiscoveredFiles,
    };
  }

  private _hasReusableChangedFileDiscoveryState(
    workspaceRoot: string,
    filePaths: readonly string[],
  ): boolean {
    return filePaths.length > 0
      && this._lastWorkspaceRoot === workspaceRoot
      && this._lastDiscoveredFiles.length > 0;
  }

  private _createDiscoveredFilesByRelativePath(): Map<string, IDiscoveredFile> {
    return new Map(
      this._lastDiscoveredFiles.map(file => [
        normalizeGraphMetricFilePath(file.relativePath),
        file,
      ]),
    );
  }

  private _canReuseChangedFileDiscovery(
    filePath: string,
    workspaceRoot: string,
    discoveredByRelativePath: ReadonlyMap<string, IDiscoveredFile>,
  ): boolean {
    const relativePath = this._toWorkspaceRelativePath(workspaceRoot, filePath);
    return Boolean(
      relativePath
      && discoveredByRelativePath.has(relativePath)
      && fs.existsSync(this._toAbsoluteChangedFilePath(workspaceRoot, filePath)),
    );
  }

  private _toAbsoluteChangedFilePath(workspaceRoot: string, filePath: string): string {
    return path.isAbsolute(filePath) ? filePath : path.join(workspaceRoot, filePath);
  }

  async refreshAnalysisScope(
    filterPatterns: string[] = [],
    disabledPlugins: Set<string> = new Set(),
    signal?: AbortSignal,
    onProgress?: (progress: { phase: string; current: number; total: number }) => void,
  ): Promise<IGraphData> {
    const workspaceRoot = this._getWorkspaceRoot();
    if (!workspaceRoot) {
      return { nodes: [], edges: [] };
    }

    const config = this._config.getAll();
    const disabledCustomPatterns = new Set(config.disabledCustomFilterPatterns);
    const disabledPluginPatterns = new Set(config.disabledPluginFilterPatterns);
    const discoveryResult = await discoverWorkspacePipelineFilesWithWarnings(
      createWorkspacePipelineDiscoveryDependencies(this._discovery),
      workspaceRoot,
      config,
      filterPatterns.filter(pattern => !disabledCustomPatterns.has(pattern)),
      this.getPluginFilterPatterns(disabledPlugins)
        .filter(pattern => !disabledPluginPatterns.has(pattern)),
      signal,
      message => {
        vscode.window.showWarningMessage(message);
      },
    );
    this._lastGitIgnoredPaths = discoveryResult.gitIgnoredPaths ?? [];

    if (this._canReuseCurrentAnalysisForScope(discoveryResult.files, disabledPlugins)) {
      return this._rebuildAnalysisScopeFromCurrentAnalysis({
        disabledPlugins,
        discoveredDirectories: discoveryResult.directories ?? [],
        discoveredFiles: discoveryResult.files,
        onProgress,
        showOrphans: config.showOrphans ?? true,
        workspaceRoot,
      });
    }

    return refreshWorkspacePipelineAnalysisScope(this._createWorkspaceIndexRefreshSource(disabledPlugins), {
      disabledPlugins,
      discoveredDirectories: discoveryResult.directories ?? [],
      discoveredFiles: discoveryResult.files,
      onProgress,
      persistCache: () => {
        this._persistCache();
      },
      persistIndexMetadata: async () => {
        await this._persistIndexMetadata();
      },
      signal,
      workspaceRoot,
    });
  }

  async refreshPluginFiles(
    pluginIds: readonly string[],
    filterPatterns: string[] = [],
    disabledPlugins: Set<string> = new Set(),
    signal?: AbortSignal,
    onProgress?: (progress: { phase: string; current: number; total: number }) => void,
  ): Promise<IGraphData> {
    const workspaceRoot = this._getWorkspaceRoot();
    if (!workspaceRoot || pluginIds.length === 0) {
      return { nodes: [], edges: [] };
    }

    const config = this._config.getAll();
    const disabledCustomPatterns = new Set(config.disabledCustomFilterPatterns);
    const disabledPluginPatterns = new Set(config.disabledPluginFilterPatterns);
    const discoveryResult = await discoverWorkspacePipelineFilesWithWarnings(
      createWorkspacePipelineDiscoveryDependencies(this._discovery),
      workspaceRoot,
      config,
      filterPatterns.filter(pattern => !disabledCustomPatterns.has(pattern)),
      this.getPluginFilterPatterns(disabledPlugins)
        .filter(pattern => !disabledPluginPatterns.has(pattern)),
      signal,
      message => {
        vscode.window.showWarningMessage(message);
      },
    );
    this._lastGitIgnoredPaths = discoveryResult.gitIgnoredPaths ?? [];
    return refreshWorkspacePipelinePluginFiles(this._createWorkspaceIndexRefreshSource(disabledPlugins), {
      disabledPlugins,
      discoveredDirectories: discoveryResult.directories ?? [],
      discoveredFiles: discoveryResult.files,
      onProgress,
      persistCache: () => {
        this._persistCache();
      },
      persistIndexMetadata: async () => {
        await this._persistIndexMetadata();
      },
      pluginIds,
      pluginInfos: this._registry.list(),
      signal,
      workspaceRoot,
    });
  }

  async refreshChangedFiles(
    filePaths: readonly string[],
    filterPatterns: string[] = [],
    disabledPlugins: Set<string> = new Set(),
    signal?: AbortSignal,
    onProgress?: (progress: { phase: string; current: number; total: number }) => void,
  ): Promise<IGraphData> {
    const workspaceRoot = this._getWorkspaceRoot();
    if (!workspaceRoot) {
      return { nodes: [], edges: [] };
    }

    const config = this._config.getAll();
    const disabledCustomPatterns = new Set(config.disabledCustomFilterPatterns);
    const disabledPluginPatterns = new Set(config.disabledPluginFilterPatterns);
    const reusableDiscoveryState = this._getReusableChangedFileDiscoveryState(
      workspaceRoot,
      filePaths,
    );
    let discoveryResult: ChangedFileDiscoveryState;
    if (reusableDiscoveryState) {
      discoveryResult = reusableDiscoveryState;
    } else {
      const discovered = await discoverWorkspacePipelineFilesWithWarnings(
        createWorkspacePipelineDiscoveryDependencies(this._discovery),
        workspaceRoot,
        config,
        filterPatterns.filter(pattern => !disabledCustomPatterns.has(pattern)),
        this.getPluginFilterPatterns(disabledPlugins)
          .filter(pattern => !disabledPluginPatterns.has(pattern)),
        signal,
        message => {
          vscode.window.showWarningMessage(message);
        },
      );
      discoveryResult = {
        directories: discovered.directories ?? [],
        files: discovered.files,
      };
      this._lastDiscoveredDirectories = discoveryResult.directories;
      this._lastGitIgnoredPaths = discovered.gitIgnoredPaths ?? [];
    }

    return refreshWorkspacePipelineChangedFiles(this._createWorkspaceIndexRefreshSource(disabledPlugins), {
      deferMetricOnlyIndexMetadata: true,
      disabledPlugins,
      discoveredDirectories: discoveryResult.directories,
      discoveredFiles: discoveryResult.files,
      filePaths,
      filterPatterns,
      notifyFilesChanged: (
        files,
        root,
        analysisContext,
        nextDisabledPlugins = disabledPlugins,
      ) =>
        this._registry.notifyFilesChanged(
          files,
          root,
          analysisContext,
          nextDisabledPlugins,
        ),
      onProgress,
      onDeferredIndexMetadataError: error => {
        console.warn('[CodeGraphy] Failed to persist metric-only refresh metadata.', error);
      },
      persistCache: () => {
        this._persistCache();
      },
      persistIndexMetadata: async () => {
        await this._persistIndexMetadata();
      },
      signal,
      workspaceRoot,
    });
  }

  async refreshGitignoreMetadata(
    filterPatterns: string[] = [],
    disabledPlugins: Set<string> = new Set(),
    signal?: AbortSignal,
  ): Promise<IGraphData> {
    const workspaceRoot = this._getWorkspaceRoot();
    if (!workspaceRoot) {
      return { nodes: [], edges: [] };
    }

    const config = this._config.getAll();
    const disabledCustomPatterns = new Set(config.disabledCustomFilterPatterns);
    const disabledPluginPatterns = new Set(config.disabledPluginFilterPatterns);
    const discoveryResult = await discoverWorkspacePipelineFilesWithWarnings(
      createWorkspacePipelineDiscoveryDependencies(this._discovery),
      workspaceRoot,
      config,
      filterPatterns.filter(pattern => !disabledCustomPatterns.has(pattern)),
      this.getPluginFilterPatterns(disabledPlugins)
        .filter(pattern => !disabledPluginPatterns.has(pattern)),
      signal,
      message => {
        vscode.window.showWarningMessage(message);
      },
    );

    this._lastDiscoveredDirectories = discoveryResult.directories ?? [];
    this._lastDiscoveredFiles = discoveryResult.files;
    this._lastGitIgnoredPaths = discoveryResult.gitIgnoredPaths ?? [];
    this._lastWorkspaceRoot = workspaceRoot;

    void this._persistIndexMetadata().catch(error => {
      console.warn('[CodeGraphy] Failed to persist gitignore metadata refresh.', error);
    });

    return this._buildGraphDataFromAnalysis(
      this._lastFileAnalysis,
      workspaceRoot,
      config.showOrphans,
      disabledPlugins,
    );
  }

  abstract invalidateWorkspaceFiles(filePaths: readonly string[]): string[];
}
