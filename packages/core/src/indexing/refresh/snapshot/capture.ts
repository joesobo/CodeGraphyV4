import type { IWorkspaceFileAnalysisResult } from '../../../analysis/fileAnalysis';
import type { IDiscoveredFile } from '../../../discovery/contracts';
import type { WorkspaceIndexRefreshSource } from '../contracts';
import { canCaptureWorkspaceIndexRefreshGraphSnapshot } from './eligibility';
import {
  serializeWorkspaceIndexConnections,
  serializeWorkspaceIndexGraphAnalysis,
} from './serialization';

interface WorkspaceIndexRefreshGraphSnapshot {
  fileAnalysisByPath: Map<string, string>;
  fileConnectionsByPath: Map<string, string>;
}

export function captureWorkspaceIndexRefreshGraphSnapshot(
  source: WorkspaceIndexRefreshSource,
  files: readonly IDiscoveredFile[],
): WorkspaceIndexRefreshGraphSnapshot | undefined {
  if (!canCaptureWorkspaceIndexRefreshGraphSnapshot(source)) {
    return undefined;
  }

  const snapshot: WorkspaceIndexRefreshGraphSnapshot = {
    fileAnalysisByPath: new Map(),
    fileConnectionsByPath: new Map(),
  };

  for (const file of files) {
    if (!captureWorkspaceIndexRefreshSnapshotFile(source, snapshot, file.relativePath)) {
      return undefined;
    }
  }

  return snapshot;
}

export function canPatchWorkspaceIndexRefreshGraphData(
  snapshot: WorkspaceIndexRefreshGraphSnapshot | undefined,
  analysisResult: IWorkspaceFileAnalysisResult,
  files: readonly IDiscoveredFile[],
): boolean {
  if (!snapshot) {
    return false;
  }

  return files.every(file =>
    workspaceIndexRefreshSnapshotMatchesFile(snapshot, analysisResult, file.relativePath),
  );
}

function captureWorkspaceIndexRefreshSnapshotFile(
  source: WorkspaceIndexRefreshSource,
  snapshot: WorkspaceIndexRefreshGraphSnapshot,
  relativePath: string,
): boolean {
  const analysis = source._lastFileAnalysis.get(relativePath);
  if (!analysis) {
    return false;
  }

  snapshot.fileAnalysisByPath.set(relativePath, serializeWorkspaceIndexGraphAnalysis(analysis));
  snapshot.fileConnectionsByPath.set(
    relativePath,
    serializeWorkspaceIndexConnections(source._lastFileConnections.get(relativePath)),
  );
  return true;
}

function workspaceIndexRefreshSnapshotMatchesFile(
  snapshot: WorkspaceIndexRefreshGraphSnapshot,
  analysisResult: IWorkspaceFileAnalysisResult,
  relativePath: string,
): boolean {
  const analysis = analysisResult.fileAnalysis.get(relativePath);
  if (!analysis) {
    return false;
  }

  return snapshot.fileAnalysisByPath.get(relativePath) === serializeWorkspaceIndexGraphAnalysis(analysis)
    && snapshot.fileConnectionsByPath.get(relativePath)
      === serializeWorkspaceIndexConnections(analysisResult.fileConnections.get(relativePath));
}
