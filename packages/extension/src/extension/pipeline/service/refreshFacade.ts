import * as vscode from 'vscode';
import type { IGraphData } from '../../../shared/graph/contracts';
import { WorkspacePipelineDiscoveryFacade } from './discoveryFacade';
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
      _lastWorkspaceRoot: {
        get: () => this._lastWorkspaceRoot,
        set: (root: WorkspacePipelineRefreshSource['_lastWorkspaceRoot']) => {
          this._lastWorkspaceRoot = root;
        },
      },
    });

    return source;
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
    this._lastGitIgnoredPaths = discoveryResult.gitIgnoredPaths ?? [];

    return refreshWorkspacePipelineChangedFiles(this._createWorkspaceIndexRefreshSource(disabledPlugins), {
      disabledPlugins,
      discoveredDirectories: discoveryResult.directories ?? [],
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
