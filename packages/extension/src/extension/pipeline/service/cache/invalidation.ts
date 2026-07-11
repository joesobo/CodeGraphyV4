import path from 'node:path';
import type { IFileAnalysisResult, IProjectedConnection } from '../../../../core/plugins/types/contracts';
import { invalidateWorkspaceIndexEngineFiles } from '@codegraphy-dev/core';
import type { IWorkspaceAnalysisCache } from '../../cache';

interface WorkspacePipelineInvalidationState {
  cache: IWorkspaceAnalysisCache;
  lastFileAnalysis: Map<string, IFileAnalysisResult>;
  lastFileConnections: Map<string, IProjectedConnection[]>;
}

export function invalidateWorkspacePipelineFiles(
  state: WorkspacePipelineInvalidationState,
  workspaceRoot: string,
  filePaths: readonly string[],
  toWorkspaceRelativePath: (workspaceRoot: string, filePath: string) => string | undefined,
): string[] {
  return invalidateWorkspaceIndexEngineFiles(
    {
      cache: state.cache,
      discoveredDirectories: [],
      discoveredFiles: [],
      gitIgnoredPaths: [],
      fileAnalysis: state.lastFileAnalysis,
      fileConnections: state.lastFileConnections,
      filesExcludedCount: 0,
      graph: { nodes: [], edges: [] },
      workspaceRoot,
    },
    workspaceRoot,
    filePaths,
    toWorkspaceRelativePath,
  );
}

export function resolveWorkspacePipelinePluginFilePaths(
  workspaceRoot: string,
  discoveredFiles: ReadonlyArray<{ relativePath: string }>,
  pluginInfos: ReadonlyArray<{ plugin: { supportedExtensions: readonly string[] } }>,
): string[] {
  const invalidateAllFiles = pluginInfos.some(({ plugin }) => plugin.supportedExtensions.includes('*'));
  const targetFiles = invalidateAllFiles
    ? discoveredFiles
    : discoveredFiles.filter((file) => {
      const extension = path.extname(file.relativePath).toLowerCase();
      return pluginInfos.some(({ plugin }) => plugin.supportedExtensions.includes(extension));
    });

  return targetFiles.map(file => path.join(workspaceRoot, file.relativePath));
}
