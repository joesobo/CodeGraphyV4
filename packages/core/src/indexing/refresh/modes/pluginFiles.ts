import type { IGraphData } from '../../../graph/contracts';
import type {
  WorkspaceIndexPluginRefreshDependencies,
  WorkspaceIndexRefreshSource,
} from '../contracts';
import { buildWorkspaceIndexGraphFromRefreshState } from '../graph';
import {
  selectWorkspaceIndexPluginFiles,
  selectWorkspaceIndexPluginInfos,
} from '../plugins';
import {
  applyWorkspaceIndexAnalysisResult,
  retainWorkspaceIndexDiscoveredFileConnections,
  updateWorkspaceIndexDiscoveryState,
} from '../state';

export async function refreshWorkspaceIndexPluginFiles(
  source: WorkspaceIndexRefreshSource,
  dependencies: WorkspaceIndexPluginRefreshDependencies,
): Promise<IGraphData> {
  updateWorkspaceIndexDiscoveryState(source, dependencies);
  retainWorkspaceIndexDiscoveredFileConnections(source, dependencies.discoveredFiles);

  const pluginInfos = selectWorkspaceIndexPluginInfos(
    dependencies.pluginInfos,
    dependencies.pluginIds,
  );
  const registeredPluginIds = pluginInfos.map(({ plugin }) => plugin.id);

  const pluginFiles = selectWorkspaceIndexPluginFiles(pluginInfos, dependencies.discoveredFiles);
  const cachePatch = pluginFiles.length > 0
    ? {
        deleteFilePaths: [] as const,
        upsertFilePaths: pluginFiles.map(file => file.relativePath),
      }
    : undefined;
  if (pluginFiles.length > 0) {
    dependencies.onProgress?.({
      phase: 'Applying Plugin',
      current: 0,
      total: pluginFiles.length,
    });
    const analysisResult = await source._analyzeFiles(
      pluginFiles,
      dependencies.workspaceRoot,
      progress => {
        dependencies.onProgress?.({
          phase: 'Applying Plugin',
          current: progress.current,
          total: progress.total,
        });
      },
      dependencies.signal,
      registeredPluginIds,
      dependencies.disabledPlugins,
      { forceAnalyze: true },
    );

    applyWorkspaceIndexAnalysisResult(source, analysisResult);
  }

  const graphData = buildWorkspaceIndexGraphFromRefreshState(
    source,
    dependencies.workspaceRoot,
    dependencies.disabledPlugins,
  );
  if (cachePatch && dependencies.persistCachePatch) {
    await dependencies.persistCachePatch({ ...cachePatch, graph: graphData });
  } else if (cachePatch) {
    await dependencies.persistCache();
  }
  await dependencies.persistIndexMetadata();

  return graphData;
}
