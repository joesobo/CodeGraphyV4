import type { IGraphData } from '../../../../../shared/graph/contracts';
import type { RefreshFacadeContext } from '../context';
import { EMPTY_REFRESH_GRAPH } from '../context';
import { discoverRefreshWorkspaceFiles } from '../discovery/workspace';

interface RefreshGitignoreMetadataInput {
  disabledPlugins: Set<string>;
  filterPatterns: string[];
  signal?: AbortSignal;
}

export async function refreshGitignoreMetadataForFacade(
  facade: RefreshFacadeContext,
  input: RefreshGitignoreMetadataInput,
): Promise<IGraphData> {
  const workspaceRoot = facade._getWorkspaceRoot();
  if (!workspaceRoot) {
    return EMPTY_REFRESH_GRAPH;
  }

  const { config, discoveryResult } = await discoverRefreshWorkspaceFiles({
    configReader: facade._config,
    disabledPlugins: input.disabledPlugins,
    discovery: facade._discovery,
    filterPatterns: input.filterPatterns,
    getPluginFilterPatterns: plugins => facade.getPluginFilterPatterns(plugins),
    signal: input.signal,
    workspaceRoot,
  });

  facade._lastDiscoveredDirectories = discoveryResult.directories ?? [];
  facade._lastDiscoveredFiles = discoveryResult.files;
  facade._lastGitIgnoredPaths = discoveryResult.gitIgnoredPaths ?? [];
  facade._lastWorkspaceRoot = workspaceRoot;

  void facade._persistIndexMetadata().catch(error => {
    console.warn('[CodeGraphy] Failed to persist gitignore metadata refresh.', error);
  });

  const eligibleFilePaths = new Set(
    discoveryResult.files.map(file => file.relativePath),
  );
  const eligibleFileAnalysis = new Map(
    [...facade._lastFileAnalysis].filter(([filePath]) => eligibleFilePaths.has(filePath)),
  );
  return facade._buildGraphDataFromAnalysis(
    eligibleFileAnalysis,
    workspaceRoot,
    config.showOrphans,
    input.disabledPlugins,
  );
}
