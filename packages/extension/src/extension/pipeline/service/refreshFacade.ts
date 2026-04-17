import * as vscode from 'vscode';
import type { IGraphData } from '../../../shared/graph/contracts';
import { WorkspacePipelineDiscoveryFacade } from './discoveryFacade';
import {
  createWorkspacePipelineDiscoveryDependencies,
  discoverWorkspacePipelineFilesWithWarnings,
} from './runtime/discovery';
import { refreshWorkspacePipelineChangedFiles } from './runtime/refresh';

export abstract class WorkspacePipelineRefreshFacade extends WorkspacePipelineDiscoveryFacade {
  async refreshChangedFiles(
    filePaths: readonly string[],
    filterPatterns: string[] = [],
    disabledPlugins: Set<string> = new Set(),
    signal?: AbortSignal,
    onProgress?: (progress: { phase: string; current: number; total: number }) => void,
  ): Promise<IGraphData> {
    this._syncPluginOrder();
    const workspaceRoot = this._getWorkspaceRoot();
    if (!workspaceRoot) {
      return { nodes: [], edges: [] };
    }

    const config = this._config.getAll();
    const discoveryResult = await discoverWorkspacePipelineFilesWithWarnings(
      createWorkspacePipelineDiscoveryDependencies(this._discovery),
      workspaceRoot,
      config,
      filterPatterns,
      this.getPluginFilterPatterns(disabledPlugins),
      signal,
      message => {
        vscode.window.showWarningMessage(message);
      },
    );

    return refreshWorkspacePipelineChangedFiles(((current) => ({
      _analyzeFiles: (files, root, progress, abortSignal) =>
        current._analyzeFiles(files, root, progress, abortSignal),
      _buildGraphDataFromAnalysis: (fileAnalysis, root, showOrphans, selectedPlugins) =>
        current._buildGraphDataFromAnalysis(fileAnalysis, root, showOrphans, selectedPlugins),
      get _lastDiscoveredFiles() {
        return current._lastDiscoveredFiles;
      },
      set _lastDiscoveredFiles(files) {
        current._lastDiscoveredFiles = files;
      },
      get _lastFileAnalysis() {
        return current._lastFileAnalysis;
      },
      set _lastFileAnalysis(fileAnalysis) {
        current._lastFileAnalysis = fileAnalysis;
      },
      get _lastFileConnections() {
        return current._lastFileConnections;
      },
      set _lastFileConnections(fileConnections) {
        current._lastFileConnections = fileConnections;
      },
      get _lastWorkspaceRoot() {
        return current._lastWorkspaceRoot;
      },
      set _lastWorkspaceRoot(root) {
        current._lastWorkspaceRoot = root;
      },
      _readAnalysisFiles: files => current._readAnalysisFiles(files),
      analyze: (patterns, selectedPlugins, abortSignal, progress) =>
        current.analyze(patterns, selectedPlugins, abortSignal, progress),
      invalidateWorkspaceFiles: paths => current.invalidateWorkspaceFiles(paths),
    }))(this), {
      config,
      disabledPlugins,
      discoveredFiles: discoveryResult.files,
      filePaths,
      filterPatterns,
      notifyFilesChanged: (files, root) => this._registry.notifyFilesChanged(files, root),
      onProgress,
      persistCache: () => {
        this._persistCache();
      },
      persistIndexMetadata: async () => {
        await this._persistIndexMetadata();
      },
      signal,
      toWorkspaceRelativePath: (root, filePath) => this._toWorkspaceRelativePath(root, filePath),
      workspaceRoot,
    });
  }

  abstract invalidateWorkspaceFiles(filePaths: readonly string[]): string[];
}
