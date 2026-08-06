import type { IGraphData } from '../../../../../shared/graph/contracts';
import {
  refreshWorkspacePipelineChangedFiles,
  runOwnedWorkspacePipelineRefresh,
  type WorkspacePipelineOwnedRefreshAttempt,
} from '../../runtime/refresh';
import {
  getReusableChangedFileDiscoveryState,
  type ChangedFileDiscoveryState,
} from '../discovery/changed';
import type { RefreshFacadeContext, RefreshProgress } from '../context';
import { EMPTY_REFRESH_GRAPH } from '../context';
import { discoverRefreshWorkspaceFiles } from '../discovery/workspace';
import type { WorkspacePipelineCachePatch } from '../../cache/storage';
import { createWorkspaceIndexRefreshSource } from '../source';

interface RefreshChangedFilesInput {
  disabledPlugins: Set<string>;
  filePaths: readonly string[];
  filterPatterns: string[];
  onProgress?: (progress: RefreshProgress) => void;
  signal?: AbortSignal;
}

export async function refreshChangedFilesForFacade(
  facade: RefreshFacadeContext,
  input: RefreshChangedFilesInput,
): Promise<IGraphData> {
  const workspaceRoot = facade._getWorkspaceRoot();
  if (!workspaceRoot) {
    return EMPTY_REFRESH_GRAPH;
  }

  return runOwnedWorkspacePipelineRefresh({
    workspaceRoot,
    rebase: async () => {
      await facade.loadCachedGraph(
        input.filterPatterns,
        input.disabledPlugins,
        input.signal,
        { forceReloadGraphCache: true },
      );
    },
    prepare: async (): Promise<WorkspacePipelineOwnedRefreshAttempt<IGraphData>> => {
      const snapshot = facade._captureRefreshState();
      let cachePatch: WorkspacePipelineCachePatch | undefined;
      let resolvedChangedFilePaths: readonly string[] | undefined;
      try {
        const discoveryResult = await getChangedFileDiscoveryState(facade, input, workspaceRoot);
        const graph = await refreshWorkspacePipelineChangedFiles(createWorkspaceIndexRefreshSource(
          facade,
          input.disabledPlugins,
        ), {
          disabledPlugins: input.disabledPlugins,
          discoveredDirectories: discoveryResult.directories,
          discoveredFiles: discoveryResult.files,
          discoveryLimitReached: discoveryResult.limitReached,
          filePaths: input.filePaths,
          filterPatterns: input.filterPatterns,
          fullRefreshFallback: 'reject',
          notifyFilesChanged: (
            files,
            root,
            analysisContext,
            nextDisabledPlugins = input.disabledPlugins,
          ) =>
            facade._registry.notifyFilesChanged(
              files,
              root,
              analysisContext,
              nextDisabledPlugins,
            ),
          onProgress: input.onProgress,
          persistCache: () => undefined,
          persistCachePatch: patch => {
            cachePatch = patch;
          },
          persistIndexMetadata: async nextResolvedChangedFilePaths => {
            resolvedChangedFilePaths = nextResolvedChangedFilePaths;
          },
          signal: input.signal,
          workspaceRoot,
        });
        if (!cachePatch) {
          throw new Error('Targeted Indexing completed without a Graph Cache patch.');
        }

        return {
          cache: facade._cache,
          completeGraph: cachePatch.completeGraph ?? facade._completeGraphData,
          nodeTypes: facade._registry.listNodeTypes(input.disabledPlugins),
          patch: cachePatch,
          persistIndexMetadata: () =>
            facade._persistIndexMetadata(resolvedChangedFilePaths),
          result: graph,
          rollback: () => facade._restoreRefreshState(snapshot),
        };
      } catch (error) {
        facade._restoreRefreshState(snapshot);
        throw error;
      }
    },
  });
}

async function getChangedFileDiscoveryState(
  facade: RefreshFacadeContext,
  input: RefreshChangedFilesInput,
  workspaceRoot: string,
): Promise<ChangedFileDiscoveryState> {
  const reusableDiscoveryState = getReusableChangedFileDiscoveryState({
    filePaths: input.filePaths,
    lastDiscoveredDirectories: facade._lastDiscoveredDirectories,
    lastDiscoveredFiles: facade._lastDiscoveredFiles,
    lastWorkspaceRoot: facade._lastWorkspaceRoot,
    toWorkspaceRelativePath: (root, filePath) =>
      facade._toWorkspaceRelativePath(root, filePath),
    workspaceRoot,
  });

  if (reusableDiscoveryState) {
    return reusableDiscoveryState;
  }

  const discovered = await discoverRefreshWorkspaceFiles({
    configReader: facade._config,
    disabledPlugins: input.disabledPlugins,
    discovery: facade._discovery,
    filterPatterns: input.filterPatterns,
    getPluginFilterPatterns: plugins => facade.getPluginFilterPatterns(plugins),
    signal: input.signal,
    workspaceRoot,
  });
  const discoveryResult = {
    directories: discovered.discoveryResult.directories ?? [],
    files: discovered.discoveryResult.files,
    limitReached: discovered.discoveryResult.limitReached,
  };
  facade._lastFilterExcludedPaths = discovered.discoveryResult.filterExcludedPaths;
  facade._lastGitIgnoredPaths = discovered.discoveryResult.gitIgnoredPaths ?? [];
  return discoveryResult;
}
