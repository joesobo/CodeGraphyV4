import { createEmptyWorkspaceAnalysisCache } from '../analysis/cache';
import { FileDiscovery } from '../discovery/file/service';
import { buildWorkspacePipelineGraphFromAnalysis } from '../graph/build';
import { saveWorkspaceAnalysisDatabaseCache } from '../graphCache/database/storage';
import { getGraphCachePath, resolveWorkspaceRoot } from '../workspace/paths';
import { analyzeWorkspaceIndexFiles } from './analysis';
import { createDisabledPluginSet } from '../plugins/activityState/model';
import type { IndexCodeGraphyWorkspaceOptions, IndexCodeGraphyWorkspaceResult } from './contracts';
import { discoverWorkspaceIndexFiles } from './discovery';
import { persistWorkspaceIndexMetadata } from './metadata';
import { createWorkspaceIndexRegistry } from './registry';
import { createEffectiveIndexSettings } from './settings';
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
  const { registry, loadedPackagePlugins } = await createWorkspaceIndexRegistry(
    options,
    settings,
    workspaceRoot,
    disabledPlugins,
  );

  await registry.initializeAll(workspaceRoot);

  const discoveryResult = await discoverWorkspaceIndexFiles({
    disabledPlugins,
    discovery,
    options,
    registry,
    settings,
    workspaceRoot,
  });
  const analysisResult = await analyzeWorkspaceIndexFiles({
    cache,
    discovery,
    discoveryResult,
    options,
    registry,
    disabledPlugins,
    workspaceRoot,
  });

  const graph = buildWorkspacePipelineGraphFromAnalysis({
    cacheFiles: cache.files,
    churnCounts: {},
    directoryPaths: discoveryResult.directories ?? [],
    gitIgnoredPaths: discoveryResult.gitIgnoredPaths ?? [],
    disabledPlugins,
    fileAnalysis: analysisResult.fileAnalysis,
    getPluginForFile: absolutePath => registry.getPluginForFile(absolutePath),
    showOrphans: true,
    workspaceRoot,
  });

  registry.notifyPostAnalyze(graph, disabledPlugins);
  registry.notifyWorkspaceReady(graph, disabledPlugins);
  saveWorkspaceAnalysisDatabaseCache(workspaceRoot, cache);
  persistWorkspaceIndexMetadata({
    loadedPackagePlugins,
    registry,
    settings,
    workspaceRoot,
  });
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
