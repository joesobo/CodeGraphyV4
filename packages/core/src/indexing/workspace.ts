import path from 'node:path';
import { createEmptyWorkspaceAnalysisCache } from '../analysis/cache';
import { createWorkspaceIndexAnalysisCacheTiers } from '../analysis/fileAnalysis';
import type { IFileDiscoveryResult } from '../discovery/contracts';
import { FileDiscovery } from '../discovery/file/service';
import { buildWorkspacePipelineGraphFromAnalysis } from '../graph/build';
import { buildCompleteWorkspaceGraphData } from '../graph/completion/model';
import {
  loadWorkspaceAnalysisDatabaseCache,
  withWorkspaceAnalysisDatabaseWriter,
} from '../graphCache/database/storage';
import { createDisabledPluginSet } from '../plugins/activityState/model';
import { createWorkspacePluginAnalysisContext } from '../plugins/context/workspace';
import type { CorePluginRegistry } from '../plugins/registry';
import { getGraphCachePath, resolveWorkspaceRoot } from '../workspace/paths';
import { readCodeGraphyWorkspaceStatus } from '../workspace/status';
import { readCodeGraphyWorkspaceMeta } from '../workspace/meta';
import { analyzeWorkspaceIndexFiles } from './analysis';
import type { IndexCodeGraphyWorkspaceOptions, IndexCodeGraphyWorkspaceResult } from './contracts';
import {
  discoverWorkspaceIndexFiles,
  isRetainedWorkspaceIndexCachePath,
} from './discovery';
import {
  createWorkspaceIndexPluginBuildSignature,
  createWorkspaceIndexPluginSignature,
  persistWorkspaceIndexMetadata,
} from './metadata';
import { createWorkspaceIndexRegistry } from './registry';
import { createEffectiveIndexSettings } from './settings';
import { timeIndexPhase, timeIndexPhaseSync } from './workspace/timing';
import { resolveSavedGraphScope } from '../workspace/graphScopeSettings';
import { createCodeGraphyWorkspaceSettingsSignature } from '../workspace/signatures';
import {
  createDefaultStatusCorePluginIds,
  createDefaultStatusPluginSignature,
} from '../workspace/statusPlugins';
import {
  createWorkspaceIndexFileContentReader,
  findAffectedWorkspaceIndexDependents,
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
  createCodeGraphyWorkspaceCacheUpdater,
  type CodeGraphyWorkspaceCacheUpdater,
  type CodeGraphyWorkspaceCacheUpdaterOptions,
  type CodeGraphyWorkspaceCacheUpdateEvent,
} from './liveUpdate/model';
export {
  subscribeCodeGraphyWorkspaceChanges,
  type CodeGraphyWorkspaceChangeSubscription,
  type CodeGraphyWorkspaceFileEvent,
  type SubscribeCodeGraphyWorkspaceChangesOptions,
} from './liveUpdate/observation/coordinator';
export { isWorkspaceDiscoveryLifecyclePath } from './liveUpdate/eligibility';
export {
  mergeWorkspaceIndexGraphData,
  refreshWorkspaceIndexAnalysisScope,
  runOwnedWorkspaceIndexRefresh,
  refreshWorkspaceIndexChangedFiles,
  refreshWorkspaceIndexPluginFiles,
  WorkspaceIndexFullRefreshRequiredError,
  WorkspaceIndexRefreshSupersededError,
  type WorkspaceIndexFullRefreshReason,
  type WorkspaceIndexOwnedRefreshAttempt,
  type WorkspaceIndexOwnedRefreshOptions,
  type WorkspaceIndexRefreshDependencies,
  type WorkspaceIndexRefreshSource,
  type WorkspaceIndexAnalysisScopeRefreshDependencies,
  type WorkspaceIndexCachePatch,
  type WorkspaceIndexPluginRefreshDependencies,
} from './refresh';

export type {
  IndexCodeGraphyWorkspaceOptions,
  IndexCodeGraphyWorkspacePlugin,
  IndexCodeGraphyWorkspacePluginEntry,
  IndexCodeGraphyWorkspaceResult,
} from './contracts';

function hasSameWorkspaceDiscovery(
  before: IFileDiscoveryResult,
  after: IFileDiscoveryResult,
): boolean {
  return before.limitReached === after.limitReached
    && haveSameWorkspacePaths(before.files, after.files)
    && haveSameWorkspacePaths(before.directories, after.directories)
    && haveSameWorkspacePaths(before.cacheFilePaths, after.cacheFilePaths)
    && haveSameWorkspacePaths(before.gitIgnoredPaths ?? [], after.gitIgnoredPaths ?? []);
}

function haveSameWorkspacePaths(
  before: readonly (string | { relativePath: string })[],
  after: readonly (string | { relativePath: string })[],
): boolean {
  if (before.length !== after.length) return false;
  const beforePaths = new Set(before.map(value => (
    typeof value === 'string' ? value : value.relativePath
  )));
  return after.every(value => beforePaths.has(
    typeof value === 'string' ? value : value.relativePath,
  ));
}

export async function indexCodeGraphyWorkspace(
  options: IndexCodeGraphyWorkspaceOptions,
): Promise<IndexCodeGraphyWorkspaceResult> {
  const workspaceRoot = resolveWorkspaceRoot(options.workspaceRoot);
  const discovery = new FileDiscovery();
  const settings = createEffectiveIndexSettings(workspaceRoot, options);
  const disabledPlugins = createDisabledPluginSet(settings, options.disabledPlugins);
  let loadedRegistry: CorePluginRegistry | undefined;
  let registryResult: Awaited<ReturnType<typeof createWorkspaceIndexRegistry>>;
  try {
    registryResult = await timeIndexPhase(
      options,
      'load-plugins',
      async () => {
        const result = await createWorkspaceIndexRegistry(
          options,
          settings,
          workspaceRoot,
          disabledPlugins,
        );
        loadedRegistry = result.registry;
        return result;
      },
      result => ({
        loadedPackagePlugins: result.loadedPackagePlugins.length,
        registeredPlugins: result.registry.list().length,
      }),
    );
  } catch (error) {
    loadedRegistry?.disposeAll();
    throw error;
  }
  const { registry, loadedPackagePlugins } = registryResult;
  const registeredPluginIds = new Set(registry.list().map(info => info.plugin.id));

  try {
  await timeIndexPhase(
    options,
    'initialize-plugins',
    () => registry.initializeAll(workspaceRoot),
    () => ({ registeredPlugins: registry.list().length }),
  );
  const activePluginIds = new Set(registry.list().map(info => info.plugin.id));
  const failedPluginIds = new Set(
    [...registeredPluginIds].filter(pluginId => !activePluginIds.has(pluginId)),
  );

  const pluginSignature = options.plugins === undefined
    ? createDefaultStatusPluginSignature(settings, options.userHomeDir)
    : createWorkspaceIndexPluginSignature({
      explicitPlugins: options.plugins,
      loadedPackagePlugins,
      registry,
    });
  const pluginBuildSignature = createWorkspaceIndexPluginBuildSignature(loadedPackagePlugins);
  const previousStatus = readCodeGraphyWorkspaceStatus(workspaceRoot, {
    pluginBuildSignature,
    pluginSignature,
    plugins: registry.list().map(info => info.plugin),
    settings,
    ...(options.userHomeDir ? { userHomeDir: options.userHomeDir } : {}),
  });
  const previousFailedPluginIds = readCodeGraphyWorkspaceMeta(workspaceRoot).failedPluginIds;
  const pluginFailureStateChanged = previousFailedPluginIds.length !== failedPluginIds.size
    || previousFailedPluginIds.some(pluginId => !failedPluginIds.has(pluginId));
  let canReusePersistedCache = previousStatus.hasGraphCache
    && previousStatus.staleReasons.every(reason => reason === 'pending-changed-files')
    && !pluginFailureStateChanged;
  const activeAnalysisCacheTiers = createWorkspaceIndexAnalysisCacheTiers(
    registry.list()
      .map(({ plugin }) => plugin.id)
      .filter(pluginId => !disabledPlugins.has(pluginId)),
  ).active;
  let cache = canReusePersistedCache
    ? loadWorkspaceAnalysisDatabaseCache(workspaceRoot, { activeAnalysisCacheTiers })
    : createEmptyWorkspaceAnalysisCache();
  const previousCacheFingerprints = new Map(
    Object.entries(cache.files).map(([filePath, entry]) => [filePath, JSON.stringify(entry)] as const),
  );
  const disabledFilterPatternsByPlugin = new Map(
    settings.plugins.map(plugin => [
      plugin.id,
      new Set(plugin.disabledFilterPatterns ?? []),
    ] as const),
  );
  const pluginFilterPatterns = registry.list().flatMap(({ plugin }) => {
    if (disabledPlugins.has(plugin.id)) return [];
    const disabledPatterns = disabledFilterPatternsByPlugin.get(plugin.id) ?? new Set<string>();
    return (plugin.defaultFilters ?? []).filter(pattern => !disabledPatterns.has(pattern));
  });

  const discoveryResult = await timeIndexPhase(
    options,
    'discover-files',
    () => discoverWorkspaceIndexFiles({
      discovery,
      options,
      pluginFilterPatterns,
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
  const cacheFilePaths = new Set(discoveryResult.cacheFilePaths);
  const deletedFilePaths = Object.keys(cache.files)
    .filter(filePath => !isRetainedWorkspaceIndexCachePath(
      filePath,
      cacheFilePaths,
      discoveryResult.cachePathPrefixes,
    ));
  const readContent = createWorkspaceIndexFileContentReader(discovery);

  if (canReusePersistedCache) {
    const changedFiles = await findChangedWorkspaceIndexFiles({
      cache,
      files: discoveryResult.files,
      readContent,
    });
    const deletedFiles = deletedFilePaths.map(filePath => ({
      absolutePath: path.resolve(workspaceRoot, filePath),
      relativePath: filePath,
      content: '',
    }));
    if (changedFiles.length > 0 || deletedFiles.length > 0) {
      const pluginChanges = await registry.notifyFilesChanged(
        [...changedFiles, ...deletedFiles],
        workspaceRoot,
        createWorkspacePluginAnalysisContext(workspaceRoot, {
          workspaceFiles: discoveryResult.files.map(file => ({
            absolutePath: file.absolutePath,
            relativePath: file.relativePath,
            extension: file.extension,
          })),
        }),
        disabledPlugins,
      );
      if (pluginChanges.requiresFullRefresh) {
        canReusePersistedCache = false;
        cache = createEmptyWorkspaceAnalysisCache();
      } else {
        const discoveredByPath = mapDiscoveredWorkspaceIndexFilesByRelativePath(discoveryResult.files);
        const affectedDependents = findAffectedWorkspaceIndexDependents({
          cache,
          invalidatedFilePaths: [
            ...changedFiles.map(file => file.relativePath),
            ...deletedFilePaths,
            ...pluginChanges.additionalFilePaths,
          ],
          workspaceRoot,
        });
        const invalidatedFiles = mergeDiscoveredWorkspaceIndexFiles(
          changedFiles,
          [...pluginChanges.additionalFilePaths, ...affectedDependents],
          discoveredByPath,
        );
        for (const filePath of deletedFilePaths) {
          delete cache.files[filePath];
        }
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
      nodeVisibility: resolveSavedGraphScope(settings).nodes,
      showOrphans: true,
      workspaceRoot,
    }),
    result => ({
      nodes: result.nodes.length,
      edges: result.edges.length,
    }),
  );
  const completeGraph = buildCompleteWorkspaceGraphData({
    cacheFiles: cache.files,
    directoryPaths: discoveryResult.directories ?? [],
    gitIgnoredPaths: discoveryResult.gitIgnoredPaths ?? [],
    disabledPlugins,
    fileAnalysis: analysisResult.fileAnalysis,
    getPluginForFile: absolutePath => registry.getPluginForFile(absolutePath),
    showOrphans: true,
    workspaceRoot,
  });

  const indexingMode = canReusePersistedCache ? 'incremental' : 'full';
  const nodeTypes = registry.listNodeTypes(disabledPlugins);
  const recovery = { cache, graph: completeGraph, nodeTypes };
  const upsertFiles = Object.fromEntries(
    Object.entries(cache.files).filter(([filePath, entry]) => (
      previousCacheFingerprints.get(filePath) !== JSON.stringify(entry)
    )),
  );
  const committed = await timeIndexPhase(
    options,
    'save-graph-cache',
    () => withWorkspaceAnalysisDatabaseWriter(workspaceRoot, async writer => {
      const verificationDiscovery = new FileDiscovery();
      const nextSettings = createEffectiveIndexSettings(workspaceRoot, options);
      if (
        createCodeGraphyWorkspaceSettingsSignature(nextSettings)
        !== createCodeGraphyWorkspaceSettingsSignature(settings)
      ) {
        return false;
      }
      const verifiedDiscoveryResult = await discoverWorkspaceIndexFiles({
        discovery: verificationDiscovery,
        options,
        pluginFilterPatterns,
        settings,
        workspaceRoot,
      });
      if (!hasSameWorkspaceDiscovery(discoveryResult, verifiedDiscoveryResult)) return false;
      const supersededFiles = await findChangedWorkspaceIndexFiles({
        cache,
        files: verifiedDiscoveryResult.files,
        readContent: file => verificationDiscovery.readContent(file),
      });
      if (supersededFiles.length > 0) return false;

      registry.notifyPostAnalyze(graph, disabledPlugins);
      if (indexingMode === 'full') {
        writer.replace(recovery);
      } else {
        writer.patch({
          deleteFilePaths: deletedFilePaths,
          upsertFiles,
          graph: completeGraph,
          nodeTypes,
        }, recovery);
      }
      await persistWorkspaceIndexMetadata({
        filterAccounting: discoveryResult.filterAccounting,
        pluginBuildSignature,
        pluginSignature,
        failedPluginIds,
        settings,
        settingsPluginIds: options.plugins === undefined
          ? createDefaultStatusCorePluginIds(settings, options.userHomeDir)
          : registeredPluginIds,
        workspaceRoot,
      });
      return true;
    }),
    () => ({
      analyzedFiles: analysisResult.cacheMisses,
      deletedFiles: deletedFilePaths.length,
      files: Object.keys(cache.files).length,
      mode: indexingMode,
      reusedFiles: analysisResult.cacheHits,
    }),
  );
  if (!committed) return indexCodeGraphyWorkspace(options);

  registry.notifyWorkspaceReady(graph, disabledPlugins);
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
  } finally {
    registry.disposeAll();
  }
}
