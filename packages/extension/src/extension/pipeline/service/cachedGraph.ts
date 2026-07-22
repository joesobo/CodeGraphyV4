import {
  BASELINE_ANALYSIS_CACHE_TIER,
  createWorkspaceIndexAnalysisCacheTiers,
  getWorkspaceIndexPluginMatchingFiles,
  hasRequiredAnalysisCacheTiers,
  SYMBOLS_ANALYSIS_CACHE_TIER,
  type AnalysisCacheTier,
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
import type { IWorkspaceAnalysisCache } from '../cache';
import type { IPluginInfo } from '../../../core/plugins/types/contracts';

export interface WorkspacePipelineCachedGraphLoadOptions {
  includeCurrentGitignoreMetadata?: boolean;
  requiredAnalysisCacheTiers?: readonly AnalysisCacheTier[];
  warmAnalysis?: boolean;
}

export abstract class WorkspacePipelineCachedGraphFacade extends WorkspacePipelineAnalysisFacade {
  async loadCachedGraph(
    _filterPatterns?: string[],
    disabledPlugins: Set<string> = new Set(),
    signal?: AbortSignal,
    options: WorkspacePipelineCachedGraphLoadOptions = {},
  ): Promise<IGraphData> {
    throwIfWorkspaceAnalysisAborted(signal);
    const workspaceRoot = this._getWorkspaceRoot();
    await this._hydrateCacheFromGraphCache({
      activeAnalysisCacheTiers: getCachedGraphRuntimeCacheTiers(
        this._getActiveAnalysisPluginIds(undefined, disabledPlugins),
        options.requiredAnalysisCacheTiers,
      ),
    });
    throwIfWorkspaceAnalysisAborted(signal);

    if (!workspaceRoot) {
      return { nodes: [], edges: [] };
    }

    const config = this._config.getAll();
    throwIfWorkspaceAnalysisAborted(signal);

    const cachedFilePaths = Object.keys(this._cache.files);
    const includeCurrentGitignoreMetadata = options.includeCurrentGitignoreMetadata !== false;
    const cachedDiscovery = createCachedWorkspaceDiscoveryState(
      workspaceRoot,
      cachedFilePaths,
      config.respectGitignore && includeCurrentGitignoreMetadata,
    );

    if (!canReplayCachedGraphAnalysis(
      this._cache.files,
      cachedDiscovery.files,
      this._registry.list(),
      options.requiredAnalysisCacheTiers,
    )) {
      return { nodes: [], edges: [] };
    }

    const fileAnalysis = new Map(
      Object.entries(this._cache.files).map(([filePath, entry]) => [
        filePath,
        entry.analysis,
      ]),
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
      registry: this._registry,
      signal,
      workspaceRoot,
    });
    if (!input) {
      return;
    }

    void warmCachedGraphAnalysisFile(input, this._discovery, this._registry).catch(error => {
      if (isWorkspaceAnalysisAbortError(error) || isMissingFileError(error)) {
        return;
      }

      console.warn('[CodeGraphy] Failed to warm cached graph analysis.', error);
    });
  }
}

function getCachedGraphRuntimeCacheTiers(
  activePluginIds: readonly string[],
  requiredAnalysisCacheTiers: readonly AnalysisCacheTier[] | undefined,
): readonly AnalysisCacheTier[] {
  if (requiredAnalysisCacheTiers && requiredAnalysisCacheTiers.length > 0) {
    return requiredAnalysisCacheTiers;
  }

  return createWorkspaceIndexAnalysisCacheTiers(activePluginIds).active
    ?? [BASELINE_ANALYSIS_CACHE_TIER];
}

function canReplayCachedGraphAnalysis(
  cachedFiles: IWorkspaceAnalysisCache['files'],
  discoveredFiles: readonly IDiscoveredFile[],
  pluginInfos: readonly IPluginInfo[],
  requiredAnalysisCacheTiers: readonly AnalysisCacheTier[] | undefined,
): boolean {
  if (!requiredAnalysisCacheTiers || requiredAnalysisCacheTiers.length === 0) {
    return true;
  }

  const entries = Object.values(cachedFiles);
  if (entries.length === 0) {
    return false;
  }

  const commonTiers = requiredAnalysisCacheTiers.filter(tier =>
    tier === BASELINE_ANALYSIS_CACHE_TIER || tier === SYMBOLS_ANALYSIS_CACHE_TIER,
  );
  if (
    commonTiers.length > 0
    && !entries.every(entry => hasRequiredAnalysisCacheTiers(entry.analysis, commonTiers))
  ) {
    return false;
  }

  return requiredAnalysisCacheTiers
    .filter(isPluginAnalysisCacheTier)
    .every(tier => canReplayPluginCacheTier(cachedFiles, discoveredFiles, pluginInfos, tier));
}

function isPluginAnalysisCacheTier(tier: AnalysisCacheTier): tier is `plugin:${string}` {
  return tier.startsWith('plugin:');
}

function canReplayPluginCacheTier(
  cachedFiles: IWorkspaceAnalysisCache['files'],
  discoveredFiles: readonly IDiscoveredFile[],
  pluginInfos: readonly IPluginInfo[],
  tier: `plugin:${string}`,
): boolean {
  const pluginId = tier.slice('plugin:'.length);
  const pluginInfo = pluginInfos.find(info => info.plugin.id === pluginId);
  if (!pluginInfo) {
    return Object.values(cachedFiles).every(entry => hasRequiredAnalysisCacheTiers(entry.analysis, [tier]));
  }

  return getWorkspaceIndexPluginMatchingFiles(pluginInfo, [...discoveredFiles])
    .every(file => {
      const analysis = cachedFiles[file.relativePath]?.analysis;
      return Boolean(analysis && hasRequiredAnalysisCacheTiers(analysis, [tier]));
    });
}
