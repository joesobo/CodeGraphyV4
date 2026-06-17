import { createEmptyWorkspaceAnalysisCache, type IWorkspaceAnalysisCache } from '../analysis/cache';
import type { IProjectedConnection } from '../analysis/projectedConnection';
import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import type { IDiscoveredFile } from '../discovery/contracts';
import type { IGraphData } from '../graph/contracts';

export interface WorkspaceIndexEngineState {
  cache: IWorkspaceAnalysisCache;
  discoveredDirectories: string[];
  discoveredFiles: IDiscoveredFile[];
  gitIgnoredPaths: string[];
  fileAnalysis: Map<string, IFileAnalysisResult>;
  fileConnections: Map<string, IProjectedConnection[]>;
  graph: IGraphData;
  workspaceRoot: string;
}

export function createWorkspaceIndexEngineState(
  cache: IWorkspaceAnalysisCache = createEmptyWorkspaceAnalysisCache(),
): WorkspaceIndexEngineState {
  return {
    cache,
    discoveredDirectories: [],
    discoveredFiles: [],
    gitIgnoredPaths: [],
    fileAnalysis: new Map(),
    fileConnections: new Map(),
    graph: { nodes: [], edges: [] },
    workspaceRoot: '',
  };
}

export function getWorkspaceIndexEngineRelativePath(
  workspaceRoot: string,
  filePath: string,
): string | undefined {
  return filePath.startsWith(`${workspaceRoot}/`)
    ? filePath.slice(workspaceRoot.length + 1)
    : undefined;
}

export function invalidateWorkspaceIndexEngineFiles(
  state: WorkspaceIndexEngineState,
  workspaceRoot: string,
  filePaths: readonly string[],
  toWorkspaceRelativePath: (
    workspaceRoot: string,
    filePath: string,
  ) => string | undefined = getWorkspaceIndexEngineRelativePath,
): string[] {
  const invalidated = new Set<string>();

  for (const filePath of filePaths) {
    const relativePath = toWorkspaceRelativePath(workspaceRoot, filePath);
    if (!relativePath) {
      continue;
    }

    delete state.cache.files[relativePath];
    state.fileAnalysis.delete(relativePath);
    state.fileConnections.delete(relativePath);
    invalidated.add(relativePath);
  }

  return [...invalidated];
}

function normalizeWorkspaceIndexRelativePath(filePath: string): string {
  return filePath.split('\\').join('/').split('/').filter(Boolean).join('/');
}

function isWorkspaceIndexDirectoryAtOrBelowPath(
  directoryPath: string,
  targetPath: string,
): boolean {
  return directoryPath === targetPath || directoryPath.startsWith(`${targetPath}/`);
}

export function removeInvalidatedWorkspaceIndexDirectories(
  directories: readonly string[],
  filePaths: readonly string[],
  workspaceRoot: string,
  toWorkspaceRelativePath: (
    workspaceRoot: string,
    filePath: string,
  ) => string | undefined = getWorkspaceIndexEngineRelativePath,
): string[] {
  const invalidatedPaths = filePaths
    .map(filePath => toWorkspaceRelativePath(workspaceRoot, filePath))
    .filter((filePath): filePath is string => Boolean(filePath))
    .map(normalizeWorkspaceIndexRelativePath);

  return directories.filter((directoryPath) => {
    const normalizedDirectory = normalizeWorkspaceIndexRelativePath(directoryPath);
    return !invalidatedPaths.some(invalidatedPath =>
      isWorkspaceIndexDirectoryAtOrBelowPath(normalizedDirectory, invalidatedPath),
    );
  });
}
