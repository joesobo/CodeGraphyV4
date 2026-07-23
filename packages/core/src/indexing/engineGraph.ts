import type { IWorkspaceAnalysisCache } from '../analysis/cache';
import type { IDiscoveryResult } from '../discovery/contracts';
import { buildWorkspacePipelineGraphFromAnalysis } from '../graph/build';
import { buildCompleteWorkspaceGraphData } from '../graph/completion/model';
import type { IGraphData } from '../graph/contracts';
import { patchWorkspaceAnalysisDatabaseCache, saveWorkspaceAnalysisDatabaseCache } from '../graphCache/database/storage';
import { createDisabledPluginSet } from '../plugins/activityState/model';
import { getGraphCachePath } from '../workspace/paths';
import type { IndexCodeGraphyWorkspaceResult } from './contracts';
import type { WorkspaceEngineRuntime } from './engineRuntime';
import { persistWorkspaceIndexMetadata } from './metadata';
import { resolveSavedGraphScope } from '../workspace/graphScopeSettings';
import {
  createDefaultStatusCorePluginIds,
  createDefaultStatusPluginSignature,
} from '../workspace/statusPlugins';
import { createWorkspaceIndexPluginSignature } from './metadata';

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
  const pluginSignature = runtime.options.plugins === undefined
    ? createDefaultStatusPluginSignature(state.settings, runtime.options.userHomeDir)
    : createWorkspaceIndexPluginSignature({
      explicitPlugins: runtime.options.plugins,
      loadedPackagePlugins: state.loadedPackagePlugins,
      registry: state.registry,
      settings: state.settings,
      includeMissingConfiguredPlugins: false,
    });
  persistWorkspaceIndexMetadata({
    pluginSignature,
    failedPluginIds: state.failedPluginIds,
    settings: state.settings,
    settingsPluginIds: runtime.options.plugins === undefined
      ? createDefaultStatusCorePluginIds(state.settings, runtime.options.userHomeDir)
      : state.registeredPluginIds,
    workspaceRoot,
  });
}

function buildCompleteEngineGraph(runtime: WorkspaceEngineRuntime): IGraphData {
  const { state, workspaceRoot } = runtime;
  if (!state.registry || !state.discoveryResult || !state.settings) {
    return state.graph;
  }
  return buildCompleteWorkspaceGraphData({
    cacheFiles: state.cache.files,
    directoryPaths: state.discoveredDirectories,
    gitIgnoredPaths: state.discoveryResult.gitIgnoredPaths ?? [],
    disabledPlugins: createDisabledPluginSet(state.settings),
    fileAnalysis: state.fileAnalysis,
    getPluginForFile: absolutePath => state.registry?.getPluginForFile(absolutePath),
    showOrphans: true,
    workspaceRoot,
  });
}

export function persistWorkspaceEngine(runtime: WorkspaceEngineRuntime): void {
  saveWorkspaceAnalysisDatabaseCache(
    runtime.workspaceRoot,
    runtime.state.cache,
    buildCompleteEngineGraph(runtime),
  );
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
  patchWorkspaceAnalysisDatabaseCache(runtime.workspaceRoot, {
    deleteFilePaths: [],
    upsertFiles,
    graph: buildCompleteEngineGraph(runtime),
  });
  persistMetadata(runtime);
}
