import type { IWorkspaceFileAnalysisResult } from '../../analysis/fileAnalysis';
import type { IDiscoveredFile } from '../../discovery/contracts';
import type {
  WorkspaceIndexAnalysisScopeRefreshDependencies,
  WorkspaceIndexRefreshSource,
} from './contracts';

export function applyWorkspaceIndexAnalysisResult(
  source: WorkspaceIndexRefreshSource,
  analysisResult: IWorkspaceFileAnalysisResult,
): void {
  for (const [filePath, analysis] of analysisResult.fileAnalysis) {
    source._lastFileAnalysis.set(filePath, analysis);
  }
  for (const [filePath, connections] of analysisResult.fileConnections) {
    source._lastFileConnections.set(filePath, connections);
  }
}

export function updateWorkspaceIndexDiscoveryState(
  source: WorkspaceIndexRefreshSource,
  dependencies: Pick<
    WorkspaceIndexAnalysisScopeRefreshDependencies,
    'discoveredDirectories' | 'discoveredFiles' | 'workspaceRoot'
  >,
): void {
  source._lastDiscoveredDirectories = dependencies.discoveredDirectories ?? [];
  source._lastDiscoveredFiles = [...dependencies.discoveredFiles];
  source._lastWorkspaceRoot = dependencies.workspaceRoot;
}

export function retainWorkspaceIndexDiscoveredFileConnections(
  source: WorkspaceIndexRefreshSource,
  discoveredFiles: readonly IDiscoveredFile[],
): void {
  for (const file of discoveredFiles) {
    if (!source._lastFileConnections.has(file.relativePath)) {
      source._lastFileConnections.set(file.relativePath, []);
    }
  }
}
