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
    );

    applyWorkspaceIndexAnalysisResult(source, analysisResult);
    dependencies.persistCache();
  }

  const graphData = buildWorkspaceIndexGraphFromRefreshState(
    source,
    dependencies.workspaceRoot,
    dependencies.disabledPlugins,
  );
  await dependencies.persistIndexMetadata();

  return graphData;
}
