import { createEmptyWorkspaceAnalysisCache } from '../analysis/cache';
import { FileDiscovery } from '../discovery/file/service';
import { buildWorkspacePipelineGraphFromAnalysis } from '../graph/build';
import { saveWorkspaceAnalysisDatabaseCache } from '../graphCache/database/storage';
import { createDisabledPluginSet } from '../plugins/activityState/model';
import { getGraphCachePath, resolveWorkspaceRoot } from '../workspace/paths';
import { analyzeWorkspaceIndexFiles } from './analysis';
import type { IndexCodeGraphyWorkspaceOptions, IndexCodeGraphyWorkspaceResult } from './contracts';
import { discoverWorkspaceIndexFiles } from './discovery';
import { persistWorkspaceIndexMetadata } from './metadata';
import { createWorkspaceIndexRegistry } from './registry';
import { createEffectiveIndexSettings } from './settings';
import { timeIndexPhase, timeIndexPhaseSync } from './workspace/timing.js';
export {
  createCodeGraphyWorkspaceEngine,
  type CodeGraphyWorkspaceEngine,
} from './engine';
export {
  refreshWorkspaceIndexAnalysisScope,
  refreshWorkspaceIndexChangedFiles,
  refreshWorkspaceIndexPluginFiles,
  type WorkspaceIndexRefreshDependencies,
  type WorkspaceIndexRefreshSource,
  type WorkspaceIndexAnalysisScopeRefreshDependencies,
  type WorkspaceIndexPluginRefreshDependencies,
} from './refresh';

export type {
  IndexCodeGraphyWorkspaceOptions,
  IndexCodeGraphyWorkspacePlugin,
  IndexCodeGraphyWorkspacePluginEntry,
  IndexCodeGraphyWorkspaceResult,
} from './contracts';

export async function indexCodeGraphyWorkspace(
  options: IndexCodeGraphyWorkspaceOptions,
): Promise<IndexCodeGraphyWorkspaceResult> {
  const workspaceRoot = resolveWorkspaceRoot(options.workspaceRoot);
  const discovery = new FileDiscovery();
  const cache = createEmptyWorkspaceAnalysisCache();
  const settings = createEffectiveIndexSettings(workspaceRoot, options);
  const disabledPlugins = createDisabledPluginSet(settings, options.disabledPlugins);
  const { registry, loadedPackagePlugins } = await timeIndexPhase(
    options,
    'load-plugins',
    () => createWorkspaceIndexRegistry(
      options,
      settings,
      workspaceRoot,
      disabledPlugins,
    ),
    result => ({
      loadedPackagePlugins: result.loadedPackagePlugins.length,
      registeredPlugins: result.registry.list().length,
    }),
  );

  await timeIndexPhase(
    options,
    'initialize-plugins',
    () => registry.initializeAll(workspaceRoot),
    () => ({ registeredPlugins: registry.list().length }),
  );

  const discoveryResult = await timeIndexPhase(
    options,
    'discover-files',
    () => discoverWorkspaceIndexFiles({
      disabledPlugins,
      discovery,
      options,
      registry,
      settings,
      workspaceRoot,
    }),
    result => ({
      files: result.files.length,
      directories: result.directories?.length ?? 0,
      totalFound: result.totalFound ?? result.files.length,
      limitReached: result.limitReached,
    }),
  );
  const analysisResult = await timeIndexPhase(
    options,
    'analyze-files',
    () => analyzeWorkspaceIndexFiles({
      cache,
      discovery,
      discoveryResult,
      options,
      registry,
      disabledPlugins,
      workspaceRoot,
    }),
    result => ({
      files: discoveryResult.files.length,
      cacheHits: result.cacheHits,
      cacheMisses: result.cacheMisses,
    }),
  );

  const graph = timeIndexPhaseSync(
    options,
    'build-graph',
    () => buildWorkspacePipelineGraphFromAnalysis({
      cacheFiles: cache.files,
      churnCounts: {},
      directoryPaths: discoveryResult.directories ?? [],
      gitIgnoredPaths: discoveryResult.gitIgnoredPaths ?? [],
      disabledPlugins,
      fileAnalysis: analysisResult.fileAnalysis,
      getPluginForFile: absolutePath => registry.getPluginForFile(absolutePath),
      showOrphans: true,
      workspaceRoot,
    }),
    result => ({
      nodes: result.nodes.length,
      edges: result.edges.length,
    }),
  );

  registry.notifyPostAnalyze(graph, disabledPlugins);
  registry.notifyWorkspaceReady(graph, disabledPlugins);
  timeIndexPhaseSync(
    options,
    'save-graph-cache',
    () => saveWorkspaceAnalysisDatabaseCache(workspaceRoot, cache),
    () => ({ files: Object.keys(cache.files).length }),
  );
  timeIndexPhaseSync(
    options,
    'persist-metadata',
    () => persistWorkspaceIndexMetadata({
      loadedPackagePlugins,
      registry,
      settings,
      workspaceRoot,
    }),
  );
  options.logInfo?.(`[CodeGraphy] Graph built: ${graph.nodes.length} nodes, ${graph.edges.length} edges`);

  return {
    workspaceRoot,
    graphCachePath: getGraphCachePath(workspaceRoot),
    graph,
    cache,
    files: discoveryResult.files,
    directories: discoveryResult.directories ?? [],
    gitIgnoredPaths: discoveryResult.gitIgnoredPaths ?? [],
    limitReached: discoveryResult.limitReached,
    totalFound: discoveryResult.totalFound ?? discoveryResult.files.length,
  };
}
