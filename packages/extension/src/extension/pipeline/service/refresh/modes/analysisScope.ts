import type { IGraphData } from '../../../../../shared/graph/contracts';
import { refreshWorkspacePipelineAnalysisScope } from '../../runtime/refresh';
import {
  canReuseCurrentAnalysisForScope,
  rebuildAnalysisScopeFromCurrentAnalysis,
} from '../scope';
import { createWorkspaceIndexRefreshSource } from '../source';
import type { RefreshFacadeContext, RefreshProgress } from '../context';
import { EMPTY_REFRESH_GRAPH } from '../context';
import { discoverRefreshWorkspaceFiles } from '../discovery/workspace';

interface RefreshAnalysisScopeInput {
  disabledPlugins: Set<string>;
  filterPatterns: string[];
  onProgress?: (progress: RefreshProgress) => void;
  signal?: AbortSignal;
}

export async function refreshAnalysisScopeForFacade(
  facade: RefreshFacadeContext,
  input: RefreshAnalysisScopeInput,
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
  facade._lastGitIgnoredPaths = discoveryResult.gitIgnoredPaths ?? [];
  facade._lastFilesExcludedCount = discoveryResult.filesExcludedCount ?? 0;

  if (canReuseCurrentAnalysisForScope({
    activePluginIds: facade._getActiveAnalysisPluginIds(undefined, input.disabledPlugins),
    disabledPlugins: input.disabledPlugins,
    discoveredFiles: discoveryResult.files,
    lastFileAnalysis: facade._lastFileAnalysis,
    nodeVisibility: facade._config.get<Record<string, boolean>>('nodeVisibility', {}) ?? {},
  })) {
    return rebuildAnalysisScopeFromCurrentAnalysis(facade, {
      disabledPlugins: input.disabledPlugins,
      discoveredDirectories: discoveryResult.directories ?? [],
      discoveredFiles: discoveryResult.files,
      onProgress: input.onProgress,
      showOrphans: config.showOrphans ?? true,
      workspaceRoot,
    });
  }

  return refreshWorkspacePipelineAnalysisScope(createWorkspaceIndexRefreshSource(
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
    persistIndexMetadata: async () => {
      await facade._persistIndexMetadata();
    },
    signal: input.signal,
    workspaceRoot,
  });
}
