import {
  type IDiscoveredFile,
  projectFileAnalysisConnections,
  throwIfWorkspaceAnalysisAborted,
} from '@codegraphy-dev/core';
import type { IGraphData } from '../../../shared/graph/contracts';
import { createCachedWorkspaceDiscoveryState } from './cache/cachedDiscovery';
import {
  isMissingFileError,
  isWorkspaceAnalysisAbortError,
} from './cachedGraphWarmup/errors';
import { warmCachedGraphAnalysisFile } from './cachedGraphWarmup/execution';
import { createCachedGraphAnalysisWarmupInput } from './cachedGraphWarmup/input';
import {
  WorkspacePipelineAnalysisFacade,
} from './analysisFacade';

export interface WorkspacePipelineCachedGraphLoadOptions {
  includeCurrentGitignoreMetadata?: boolean;
  warmAnalysis?: boolean;
}

export abstract class WorkspacePipelineCachedGraphFacade extends WorkspacePipelineAnalysisFacade {
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
}
