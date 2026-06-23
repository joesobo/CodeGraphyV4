import type { IGraphData } from '../graph/contracts';
import type {
  WorkspaceIndexAnalysisScopeRefreshDependencies,
  WorkspaceIndexPluginRefreshDependencies,
  WorkspaceIndexRefreshDependencies,
  WorkspaceIndexRefreshSource,
} from './refresh/contracts';
import { refreshWorkspaceIndexAnalysisScope as refreshWorkspaceIndexAnalysisScopeImpl } from './refresh/modes/analysisScope';
import { refreshWorkspaceIndexChangedFiles as refreshWorkspaceIndexChangedFilesImpl } from './refresh/modes/changedFiles';
import { refreshWorkspaceIndexPluginFiles as refreshWorkspaceIndexPluginFilesImpl } from './refresh/modes/pluginFiles';

export type {
  WorkspaceIndexAnalysisScopeRefreshDependencies,
  WorkspaceIndexPluginInfo,
  WorkspaceIndexPluginRefreshDependencies,
  WorkspaceIndexRefreshDependencies,
  WorkspaceIndexRefreshSource,
} from './refresh/contracts';

export function refreshWorkspaceIndexAnalysisScope(
  source: WorkspaceIndexRefreshSource,
  dependencies: WorkspaceIndexAnalysisScopeRefreshDependencies,
): Promise<IGraphData> {
  return refreshWorkspaceIndexAnalysisScopeImpl(source, dependencies);
}

export function refreshWorkspaceIndexChangedFiles(
  source: WorkspaceIndexRefreshSource,
  dependencies: WorkspaceIndexRefreshDependencies,
): Promise<IGraphData> {
  return refreshWorkspaceIndexChangedFilesImpl(source, dependencies);
}

export function refreshWorkspaceIndexPluginFiles(
  source: WorkspaceIndexRefreshSource,
  dependencies: WorkspaceIndexPluginRefreshDependencies,
): Promise<IGraphData> {
  return refreshWorkspaceIndexPluginFilesImpl(source, dependencies);
}
