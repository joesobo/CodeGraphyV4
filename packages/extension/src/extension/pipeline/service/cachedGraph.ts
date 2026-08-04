import {
  BASELINE_ANALYSIS_CACHE_TIER,
  getWorkspaceIndexPluginMatchingFiles,
  hasRequiredAnalysisCacheTiers,
  matchesAnyPattern,
  SYMBOLS_ANALYSIS_CACHE_TIER,
  type AnalysisCacheTier,
  type IDiscoveredFile,
  projectFileAnalysisConnections,
  throwIfWorkspaceAnalysisAborted,
} from '@codegraphy-dev/core';
import type { IGraphData } from '../../../shared/graph/contracts';
import {
  collectCachedDirectoryPaths,
  createCachedWorkspaceDiscoveryState,
} from './cache/cachedDiscovery';
import {
  WorkspacePipelineAnalysisFacade,
} from './analysisFacade';
import type { IWorkspaceAnalysisCache } from '../cache';
import type { IPluginInfo } from '../../../core/plugins/types/contracts';
import { hasWorkspacePipelineIndex } from './cache/index';

export interface WorkspacePipelineCachedGraphLoadOptions {
  forceReloadGraphCache?: boolean;
  requiredAnalysisCacheTiers?: readonly AnalysisCacheTier[];
}

export abstract class WorkspacePipelineCachedGraphFacade extends WorkspacePipelineAnalysisFacade {
  async loadCachedGraph(
    filterPatterns: string[] = [],
    disabledPlugins: Set<string> = new Set(),
    signal?: AbortSignal,
    options: WorkspacePipelineCachedGraphLoadOptions = {},
  ): Promise<IGraphData> {
    throwIfWorkspaceAnalysisAborted(signal);
    const workspaceRoot = this._getWorkspaceRoot();
    await this._hydrateCacheFromGraphCache({
      ...(options.forceReloadGraphCache ? { forceReload: true } : {}),
      preserveAllAnalysisFacts: true,
      rejectUnreadable: true,
    });
    throwIfWorkspaceAnalysisAborted(signal);

    if (!workspaceRoot) {
      return { nodes: [], edges: [] };
    }

    const config = this._config.getAll();
    throwIfWorkspaceAnalysisAborted(signal);

    const cachedFilePaths = Object.keys(this._cache.files);
    const cachedDiscovery = createCachedWorkspaceDiscoveryState(
      workspaceRoot,
      cachedFilePaths,
    );

    const activeFilterPatterns = [
      ...this._getEffectiveCustomFilterPatterns(filterPatterns),
      ...this._getEffectivePluginFilterPatterns(disabledPlugins),
    ];
    const gitIgnoredPaths = new Set(cachedDiscovery.gitIgnoredPaths);
    const eligibleFiles = cachedDiscovery.files.filter(file => (
      !gitIgnoredPaths.has(file.relativePath)
      && !matchesAnyPattern(file.relativePath, activeFilterPatterns)
    ));
    const eligibleFilePaths = new Set(eligibleFiles.map(file => file.relativePath));
    const eligibleCacheFiles = Object.fromEntries(
      Object.entries(this._cache.files).filter(([filePath]) => eligibleFilePaths.has(filePath)),
    );

    if (!canReplayCachedGraphAnalysis(
      eligibleCacheFiles,
      eligibleFiles,
      this._registry.list(),
      options.requiredAnalysisCacheTiers,
    )) {
      return { nodes: [], edges: [] };
    }

    const fileAnalysis = new Map(
      Object.entries(eligibleCacheFiles).map(([filePath, entry]) => [
        filePath,
        entry.analysis,
      ]),
    );

    this._lastDiscoveredFiles = eligibleFiles;
    this._lastDiscoveredDirectories = collectCachedDirectoryPaths(
      eligibleFiles.map(file => file.relativePath),
    );
    this._lastGitIgnoredPaths = cachedDiscovery.gitIgnoredPaths;
    this._lastFileAnalysis = fileAnalysis;
    this._lastFileConnections = projectFileAnalysisConnections(fileAnalysis, workspaceRoot);
    this._lastWorkspaceRoot = workspaceRoot;
    const replayAnalysisPluginIds = collectCachedAnalysisPluginIds(fileAnalysis);
    this._replayAnalysisPluginIds = replayAnalysisPluginIds;

    throwIfWorkspaceAnalysisAborted(signal);

    const graphData = this._buildGraphDataFromAnalysis(
      fileAnalysis,
      workspaceRoot,
      config.showOrphans,
      disabledPlugins,
    );
    if (hasWorkspacePipelineIndex(workspaceRoot)) {
      this._markRecoverableGraphState(workspaceRoot);
    }

    return graphData;
  }
}

function readMetadataPluginId(metadata: Readonly<Record<string, unknown>> | undefined): string | undefined {
  const pluginId = metadata?.pluginId;
  const source = metadata?.source;
  return typeof pluginId === 'string' && pluginId.length > 0
    ? pluginId
    : typeof source === 'string' && source.length > 0 ? source : undefined;
}

function collectCachedAnalysisPluginIds(
  fileAnalysis: ReadonlyMap<string, IWorkspaceAnalysisCache['files'][string]['analysis']>,
): ReadonlySet<string> {
  const pluginIds = new Set<string>();
  for (const analysis of fileAnalysis.values()) {
    for (const node of analysis.nodes ?? []) {
      const pluginId = readMetadataPluginId(node.metadata);
      if (pluginId) pluginIds.add(pluginId);
    }
    for (const symbol of analysis.symbols ?? []) {
      const pluginId = readMetadataPluginId(symbol.metadata);
      if (pluginId) pluginIds.add(pluginId);
    }
    for (const relation of analysis.relations ?? []) {
      if (relation.pluginId) pluginIds.add(relation.pluginId);
    }
  }
  return pluginIds;
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
