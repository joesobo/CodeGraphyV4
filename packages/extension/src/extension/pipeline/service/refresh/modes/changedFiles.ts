import type { IGraphData } from '../../../../../shared/graph/contracts';
import { refreshWorkspacePipelineChangedFiles } from '../../runtime/refresh';
import {
  getReusableChangedFileDiscoveryState,
  type ChangedFileDiscoveryState,
} from '../discovery/changed';
import type { RefreshFacadeContext, RefreshProgress } from '../context';
import { EMPTY_REFRESH_GRAPH } from '../context';
import { discoverRefreshWorkspaceFiles } from '../discovery/workspace';
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

  const discoveryResult = await getChangedFileDiscoveryState(facade, input, workspaceRoot);
  return refreshWorkspacePipelineChangedFiles(createWorkspaceIndexRefreshSource(
    facade,
    input.disabledPlugins,
  ), {
    deferMetricOnlyIndexMetadata: true,
    disabledPlugins: input.disabledPlugins,
    discoveredDirectories: discoveryResult.directories,
    discoveredFiles: discoveryResult.files,
    filePaths: input.filePaths,
    filterPatterns: input.filterPatterns,
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
    onDeferredIndexMetadataError: error => {
      console.warn('[CodeGraphy] Failed to persist metric-only refresh metadata.', error);
    },
    onProgress: input.onProgress,
    persistCache: () => {
      facade._persistCache();
    },
    persistIndexMetadata: async () => {
      await facade._persistIndexMetadata();
    },
    signal: input.signal,
    workspaceRoot,
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
  };
  facade._lastDiscoveredDirectories = discoveryResult.directories;
  facade._lastGitIgnoredPaths = discovered.discoveryResult.gitIgnoredPaths ?? [];
  return discoveryResult;
}
