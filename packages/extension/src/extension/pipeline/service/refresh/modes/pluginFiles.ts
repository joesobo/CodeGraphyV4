import type { IGraphData } from '../../../../../shared/graph/contracts';
import { refreshWorkspacePipelinePluginFiles } from '../../runtime/refresh';
import { createWorkspaceIndexRefreshSource } from '../source';
import type { RefreshFacadeContext, RefreshProgress } from '../context';
import { EMPTY_REFRESH_GRAPH } from '../context';
import { discoverRefreshWorkspaceFiles } from '../discovery/workspace';

interface RefreshPluginFilesInput {
  disabledPlugins: Set<string>;
  filterPatterns: string[];
  onProgress?: (progress: RefreshProgress) => void;
  pluginIds: readonly string[];
  signal?: AbortSignal;
}

export async function refreshPluginFilesForFacade(
  facade: RefreshFacadeContext,
  input: RefreshPluginFilesInput,
): Promise<IGraphData> {
  const workspaceRoot = facade._getWorkspaceRoot();
  if (!workspaceRoot || input.pluginIds.length === 0) {
    return EMPTY_REFRESH_GRAPH;
  }

  const { discoveryResult } = await discoverRefreshWorkspaceFiles({
    configReader: facade._config,
    disabledPlugins: input.disabledPlugins,
    discovery: facade._discovery,
    filterPatterns: input.filterPatterns,
    getPluginFilterPatterns: plugins => facade.getPluginFilterPatterns(plugins),
    signal: input.signal,
    workspaceRoot,
  });
  facade._lastGitIgnoredPaths = discoveryResult.gitIgnoredPaths ?? [];

  return refreshWorkspacePipelinePluginFiles(createWorkspaceIndexRefreshSource(
    facade,
    input.disabledPlugins,
  ), {
    disabledPlugins: input.disabledPlugins,
    discoveredDirectories: discoveryResult.directories ?? [],
    discoveredFiles: discoveryResult.files,
    onProgress: input.onProgress,
    persistCache: () => {
      facade._persistCache();
    },
    persistCachePatch: patch => {
      facade._persistCachePatch(patch);
    },
    persistIndexMetadata: async () => {
      await facade._persistIndexMetadata();
    },
    pluginIds: input.pluginIds,
    pluginInfos: facade._registry.list(),
    signal: input.signal,
    workspaceRoot,
  });
}
