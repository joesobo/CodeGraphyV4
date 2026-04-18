import path from 'node:path';
import type { IFileAnalysisResult, IProjectedConnection } from '../../../../core/plugins/types/contracts';
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
  const invalidated = new Set<string>();

  for (const filePath of filePaths) {
    const relativePath = toWorkspaceRelativePath(workspaceRoot, filePath);
    if (!relativePath) {
      continue;
    }

    delete state.cache.files[relativePath];
    state.lastFileAnalysis.delete(relativePath);
    state.lastFileConnections.delete(relativePath);
    invalidated.add(relativePath);
  }

  return [...invalidated];
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
