import fs from 'node:fs';
import path from 'node:path';
import * as vscode from 'vscode';
import {
  hasRequiredAnalysisCacheTiers,
  type IDiscoveredFile,
} from '@codegraphy-dev/core';
import type { IGraphData } from '../../../shared/graph/contracts';
import { WorkspacePipelineDiscoveryFacade } from './discoveryFacade';
import { recordExtensionPerformanceEvent } from '../../performance/marks';
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

function recordChangedFileRefreshPhase(
  phase: string,
  startedAt: number,
  detail: Record<string, unknown> = {},
): void {
  recordExtensionPerformanceEvent('workspacePipeline.refreshChangedFiles.phase', {
    ...detail,
    durationMs: Date.now() - startedAt,
    phase,
  });
}

async function timeChangedFileRefreshPhase<T>(
  phase: string,
  operation: () => Promise<T>,
  describeResult: (result: T) => Record<string, unknown> = () => ({}),
): Promise<T> {
  const startedAt = Date.now();
  const result = await operation();
  recordChangedFileRefreshPhase(phase, startedAt, describeResult(result));
  return result;
}

function timeChangedFileRefreshPhaseSync<T>(
  phase: string,
  operation: () => T,
  describeResult: (result: T) => Record<string, unknown> = () => ({}),
): T {
  const startedAt = Date.now();
  const result = operation();
  recordChangedFileRefreshPhase(phase, startedAt, describeResult(result));
  return result;
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

  private _createTimedWorkspaceIndexRefreshSource(
    disabledPlugins: Set<string>,
  ): WorkspacePipelineRefreshSource {
    const source = this._createWorkspaceIndexRefreshSource(disabledPlugins);

    const readAnalysisFiles = source._readAnalysisFiles.bind(source);
    source._readAnalysisFiles = files => timeChangedFileRefreshPhase(
      'readAnalysisFiles',
      () => readAnalysisFiles(files),
      readFiles => ({
        fileCount: files.length,
        readFileCount: readFiles.length,
      }),
    );

    const analyzeFiles = source._analyzeFiles.bind(source);
    source._analyzeFiles = (
      files,
      root,
      progress,
      abortSignal,
      pluginIds,
      nextDisabledPlugins,
    ) => timeChangedFileRefreshPhase(
      'analyzeFiles',
      () => analyzeFiles(
        files,
        root,
        progress,
        abortSignal,
        pluginIds,
        nextDisabledPlugins,
      ),
      result => ({
        cacheHits: result.cacheHits,
        cacheMisses: result.cacheMisses,
        fileCount: files.length,
        pluginIdCount: pluginIds?.length ?? 0,
      }),
    );

    const buildGraphData = source._buildGraphData.bind(source);
    source._buildGraphData = (fileConnections, root, selectedPlugins) =>
      timeChangedFileRefreshPhaseSync(
        'buildGraphData',
        () => buildGraphData(fileConnections, root, selectedPlugins),
        graphData => ({
          edgeCount: graphData.edges.length,
          fileCount: fileConnections.size,
          nodeCount: graphData.nodes.length,
        }),
      );

    const buildGraphDataFromAnalysis = source._buildGraphDataFromAnalysis.bind(source);
    source._buildGraphDataFromAnalysis = (fileAnalysis, root, selectedPlugins) =>
      timeChangedFileRefreshPhaseSync(
        'buildGraphDataFromAnalysis',
        () => buildGraphDataFromAnalysis(fileAnalysis, root, selectedPlugins),
        graphData => ({
          edgeCount: graphData.edges.length,
          fileCount: fileAnalysis.size,
          nodeCount: graphData.nodes.length,
        }),
      );

    const patchGraphDataNodeMetrics = source._patchGraphDataNodeMetrics?.bind(source);
    if (patchGraphDataNodeMetrics) {
      source._patchGraphDataNodeMetrics = (graphData, filePaths) =>
        timeChangedFileRefreshPhaseSync(
          'patchGraphDataNodeMetrics',
          () => patchGraphDataNodeMetrics(graphData, filePaths),
          patchedGraphData => ({
            changedFileCount: filePaths.length,
            edgeCount: patchedGraphData.edges.length,
            nodeCount: patchedGraphData.nodes.length,
          }),
        );
    }

    const analyze = source.analyze.bind(source);
    source.analyze = (patterns, nextDisabledPlugins, signal, progress) =>
      timeChangedFileRefreshPhase(
        'fullAnalyze',
        () => analyze(patterns, nextDisabledPlugins, signal, progress),
        graphData => ({
          edgeCount: graphData.edges.length,
          nodeCount: graphData.nodes.length,
          patternCount: patterns?.length ?? 0,
        }),
      );

    const invalidateWorkspaceFiles = source.invalidateWorkspaceFiles.bind(source);
    source.invalidateWorkspaceFiles = filePaths => timeChangedFileRefreshPhaseSync(
      'invalidateWorkspaceFiles',
      () => invalidateWorkspaceFiles(filePaths),
      invalidatedFiles => ({
        fileCount: filePaths.length,
        invalidatedFileCount: invalidatedFiles.length,
      }),
    );

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
      const filePath = getGraphMetricNodeFilePath(node);
      if (!metricFilePaths.has(filePath)) {
        return node;
      }

      const fileSize = this._cache.files[filePath]?.size;
      const churn = churnCounts[filePath] ?? 0;
      if (node.fileSize === fileSize && node.churn === churn) {
        return node;
      }

      changed = true;
      return { ...node, fileSize, churn };
    });

    return changed ? { ...graphData, nodes } : graphData;
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
    if (
      filePaths.length === 0
      || this._lastWorkspaceRoot !== workspaceRoot
      || this._lastDiscoveredFiles.length === 0
    ) {
      return undefined;
    }

    const discoveredByRelativePath = new Map(
      this._lastDiscoveredFiles.map(file => [
        file.relativePath.replace(/\\/g, '/'),
        file,
      ]),
    );

    for (const filePath of filePaths) {
      const relativePath = this._toWorkspaceRelativePath(workspaceRoot, filePath);
      if (!relativePath || !discoveredByRelativePath.has(relativePath)) {
        return undefined;
      }

      const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.join(workspaceRoot, filePath);
      if (!fs.existsSync(absolutePath)) {
        return undefined;
      }
    }

    return {
      directories: [...this._lastDiscoveredDirectories],
      files: this._lastDiscoveredFiles,
    };
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
    const refreshStartedAt = Date.now();
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
    const discoveryStartedAt = Date.now();
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
    recordExtensionPerformanceEvent('workspacePipeline.refreshChangedFiles.discovery', {
      changedFileCount: filePaths.length,
      directoryCount: discoveryResult.directories?.length ?? 0,
      durationMs: Date.now() - discoveryStartedAt,
      fileCount: discoveryResult.files.length,
      mode: reusableDiscoveryState ? 'cached' : 'discover',
    });

    const graphData = await refreshWorkspacePipelineChangedFiles(this._createTimedWorkspaceIndexRefreshSource(disabledPlugins), {
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
        timeChangedFileRefreshPhase(
          'notifyFilesChanged',
          () => this._registry.notifyFilesChanged(
            files,
            root,
            analysisContext,
            nextDisabledPlugins,
          ),
          result => ({
            additionalFilePathCount: result.additionalFilePaths.length,
            fileCount: files.length,
            requiresFullRefresh: result.requiresFullRefresh,
          }),
        ),
      onProgress,
      persistCache: () => {
        timeChangedFileRefreshPhaseSync('persistCache', () => {
          this._persistCache();
        });
      },
      persistIndexMetadata: async () => {
        await timeChangedFileRefreshPhase('persistIndexMetadata', () =>
          this._persistIndexMetadata(),
        );
      },
      signal,
      workspaceRoot,
    });
    recordExtensionPerformanceEvent('workspacePipeline.refreshChangedFiles.completed', {
      durationMs: Date.now() - refreshStartedAt,
      edgeCount: graphData.edges.length,
      nodeCount: graphData.nodes.length,
    });
    return graphData;
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
