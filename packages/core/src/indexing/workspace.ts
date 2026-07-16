import { createEmptyWorkspaceAnalysisCache } from '../analysis/cache';
import { FileDiscovery } from '../discovery/file/service';
import { buildWorkspacePipelineGraphFromAnalysis } from '../graph/build';
import {
  loadWorkspaceAnalysisDatabaseCache,
  patchWorkspaceAnalysisDatabaseCache,
  saveWorkspaceAnalysisDatabaseCache,
} from '../graphCache/database/storage';
import { createDisabledPluginSet } from '../plugins/activityState/model';
import { getGraphCachePath, resolveWorkspaceRoot } from '../workspace/paths';
import { readCodeGraphyWorkspaceStatus } from '../workspace/status';
import { analyzeWorkspaceIndexFiles } from './analysis';
import type { IndexCodeGraphyWorkspaceOptions, IndexCodeGraphyWorkspaceResult } from './contracts';
import { discoverWorkspaceIndexFiles } from './discovery';
import { createWorkspaceIndexPluginSignature, persistWorkspaceIndexMetadata } from './metadata';
import { createWorkspaceIndexRegistry } from './registry';
import { createEffectiveIndexSettings } from './settings';
import { timeIndexPhase, timeIndexPhaseSync } from './workspace/timing';
import {
  createWorkspaceIndexFileContentReader,
  findChangedWorkspaceIndexFiles,
} from './workspace/changes';
import {
  mapDiscoveredWorkspaceIndexFilesByRelativePath,
  mergeDiscoveredWorkspaceIndexFiles,
} from './changedFiles';
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

  const previousStatus = readCodeGraphyWorkspaceStatus(workspaceRoot, {
    pluginSignature: createWorkspaceIndexPluginSignature({ loadedPackagePlugins, registry }),
    settings,
    ...(options.userHomeDir ? { userHomeDir: options.userHomeDir } : {}),
  });
  let canReusePersistedCache = previousStatus.hasGraphCache
    && previousStatus.staleReasons.every(reason => reason === 'pending-changed-files');
  let cache = canReusePersistedCache
    ? loadWorkspaceAnalysisDatabaseCache(workspaceRoot)
    : createEmptyWorkspaceAnalysisCache();
  const previousCacheFingerprints = new Map(
    Object.entries(cache.files).map(([filePath, entry]) => [filePath, JSON.stringify(entry)] as const),
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
  if (
    canReusePersistedCache
    && discoveryResult.files.length > 0
    && previousCacheFingerprints.size === 0
  ) {
    canReusePersistedCache = false;
  }
  const discoveredFilePaths = new Set(discoveryResult.files.map(file => file.relativePath));
  const deletedFilePaths = Object.keys(cache.files)
    .filter(filePath => !discoveredFilePaths.has(filePath));
  const addedFilePaths = discoveryResult.files
    .filter(file => !previousCacheFingerprints.has(file.relativePath))
    .map(file => file.relativePath);
  const readContent = createWorkspaceIndexFileContentReader(discovery);

  if (canReusePersistedCache && (addedFilePaths.length > 0 || deletedFilePaths.length > 0)) {
    canReusePersistedCache = false;
    cache = createEmptyWorkspaceAnalysisCache();
  } else if (canReusePersistedCache) {
    const changedFiles = await findChangedWorkspaceIndexFiles({
      cache,
      files: discoveryResult.files,
      readContent,
    });
    if (changedFiles.length > 0) {
      const pluginChanges = await registry.notifyFilesChanged(
        changedFiles,
        workspaceRoot,
        undefined,
        disabledPlugins,
      );
      if (pluginChanges.requiresFullRefresh) {
        canReusePersistedCache = false;
        cache = createEmptyWorkspaceAnalysisCache();
      } else {
        const discoveredByPath = mapDiscoveredWorkspaceIndexFilesByRelativePath(discoveryResult.files);
        const invalidatedFiles = mergeDiscoveredWorkspaceIndexFiles(
          changedFiles,
          pluginChanges.additionalFilePaths,
          discoveredByPath,
        );
        for (const file of invalidatedFiles) {
          delete cache.files[file.relativePath];
        }
      }
    }
  }
  const analysisResult = await timeIndexPhase(
    options,
    'analyze-files',
    () => analyzeWorkspaceIndexFiles({
      cache,
      discovery,
      discoveryResult,
      options,
      registry,
      readContent,
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
  const indexingMode = canReusePersistedCache ? 'incremental' : 'full';
  timeIndexPhaseSync(
    options,
    'save-graph-cache',
    () => {
      if (indexingMode === 'full') {
        saveWorkspaceAnalysisDatabaseCache(workspaceRoot, cache);
        return;
      }

      const upsertFiles = Object.fromEntries(
        Object.entries(cache.files).filter(([filePath, entry]) => (
          previousCacheFingerprints.get(filePath) !== JSON.stringify(entry)
        )),
      );
      patchWorkspaceAnalysisDatabaseCache(workspaceRoot, {
        deleteFilePaths: deletedFilePaths,
        upsertFiles,
      });
    },
    () => ({
      analyzedFiles: analysisResult.cacheMisses,
      deletedFiles: deletedFilePaths.length,
      files: Object.keys(cache.files).length,
      mode: indexingMode,
      reusedFiles: analysisResult.cacheHits,
    }),
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
    indexing: {
      mode: indexingMode,
      analyzedFiles: analysisResult.cacheMisses,
      deletedFiles: deletedFilePaths.length,
      reusedFiles: analysisResult.cacheHits,
    },
  };
}
