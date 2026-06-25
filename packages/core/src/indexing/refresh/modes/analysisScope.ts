import type { IGraphData } from '../../../graph/contracts';
import type {
  WorkspaceIndexAnalysisScopeRefreshDependencies,
  WorkspaceIndexRefreshSource,
} from '../contracts';
import { buildWorkspaceIndexGraphFromRefreshState } from '../graph';
import { updateWorkspaceIndexDiscoveryState } from '../state';

export async function refreshWorkspaceIndexAnalysisScope(
  source: WorkspaceIndexRefreshSource,
  dependencies: WorkspaceIndexAnalysisScopeRefreshDependencies,
): Promise<IGraphData> {
  updateWorkspaceIndexDiscoveryState(source, dependencies);

  dependencies.onProgress?.({
    phase: 'Applying Scope',
    current: 0,
    total: dependencies.discoveredFiles.length,
  });

  const analysisResult = await source._analyzeFiles(
    [...dependencies.discoveredFiles],
    dependencies.workspaceRoot,
    progress => {
      dependencies.onProgress?.({
        phase: 'Applying Scope',
        current: progress.current,
        total: progress.total,
      });
    },
    dependencies.signal,
    undefined,
    dependencies.disabledPlugins,
  );

  source._lastFileAnalysis = analysisResult.fileAnalysis;
  source._lastFileConnections = analysisResult.fileConnections;
  dependencies.persistCache();

  const graphData = buildWorkspaceIndexGraphFromRefreshState(
    source,
    dependencies.workspaceRoot,
    dependencies.disabledPlugins,
  );
  await dependencies.persistIndexMetadata();

  return graphData;
}
