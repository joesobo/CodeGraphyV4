import type { IWorkspaceAnalysisCache } from '../analysis/cache';
import type { IDiscoveryResult } from '../discovery/contracts';
import { buildWorkspacePipelineGraphFromAnalysis } from '../graph/build';
import type { IGraphData } from '../graph/contracts';
import { patchWorkspaceAnalysisDatabaseCache, saveWorkspaceAnalysisDatabaseCache } from '../graphCache/database/storage';
import { getGraphCachePath } from '../workspace/paths';
import type { IndexCodeGraphyWorkspaceResult } from './contracts';
import type { WorkspaceEngineRuntime } from './engineRuntime';
import { persistWorkspaceIndexMetadata } from './metadata';
import { resolveSavedGraphScope } from '../workspace/graphScopeSettings';

export function buildWorkspaceEngineGraph(
  runtime: WorkspaceEngineRuntime,
  disabledPlugins: Set<string>,
): IGraphData {
  const { state, workspaceRoot } = runtime;
  if (!state.discoveryResult || !state.registry || !state.settings) return { nodes: [], edges: [] };

  state.graph = buildWorkspacePipelineGraphFromAnalysis({
    cacheFiles: state.cache.files,
    directoryPaths: state.discoveredDirectories,
    gitIgnoredPaths: state.discoveryResult.gitIgnoredPaths ?? [],
    disabledPlugins,
    fileAnalysis: state.fileAnalysis,
    getPluginForFile: absolutePath => state.registry?.getPluginForFile(absolutePath),
    nodeVisibility: resolveSavedGraphScope(state.settings).nodes,
    showOrphans: true,
    workspaceRoot,
  });
  return state.graph;
}

export function createWorkspaceEngineIndexResult(
  runtime: WorkspaceEngineRuntime,
  graph: IGraphData,
): IndexCodeGraphyWorkspaceResult {
  const discovery = runtime.state.discoveryResult as IDiscoveryResult;
  return {
    workspaceRoot: runtime.workspaceRoot,
    graphCachePath: getGraphCachePath(runtime.workspaceRoot),
    graph,
    cache: runtime.state.cache,
    files: discovery.files,
    directories: runtime.state.discoveredDirectories,
    gitIgnoredPaths: discovery.gitIgnoredPaths ?? [],
    limitReached: discovery.limitReached,
    totalFound: discovery.totalFound ?? discovery.files.length,
    indexing: {
      mode: 'full',
      analyzedFiles: discovery.files.length,
      deletedFiles: 0,
      reusedFiles: 0,
    },
  };
}

function persistMetadata(runtime: WorkspaceEngineRuntime): void {
  const { state, workspaceRoot } = runtime;
  if (!state.registry || !state.settings) return;
  persistWorkspaceIndexMetadata({
    loadedPackagePlugins: state.loadedPackagePlugins,
    registry: state.registry,
    settings: state.settings,
    workspaceRoot,
    includeMissingConfiguredPlugins: runtime.options.plugins === undefined,
  });
}

export function persistWorkspaceEngine(runtime: WorkspaceEngineRuntime): void {
  saveWorkspaceAnalysisDatabaseCache(runtime.workspaceRoot, runtime.state.cache);
  persistMetadata(runtime);
}

export function patchWorkspaceEngineCache(
  runtime: WorkspaceEngineRuntime,
  upsertFilePaths: readonly string[],
): void {
  const upsertFiles: IWorkspaceAnalysisCache['files'] = {};
  for (const filePath of upsertFilePaths) {
    const entry = runtime.state.cache.files[filePath];
    if (entry) upsertFiles[filePath] = entry;
  }
  patchWorkspaceAnalysisDatabaseCache(runtime.workspaceRoot, { deleteFilePaths: [], upsertFiles });
  persistMetadata(runtime);
}
