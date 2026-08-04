import {
  createEmptyWorkspaceAnalysisCache,
  type IWorkspaceAnalysisCache,
} from '../../cache';
import type { WorkspaceIndexCachePatch as WorkspacePipelineCachePatch } from '@codegraphy-dev/core';
import {
  clearWorkspaceAnalysisDatabaseCacheQueued,
  patchWorkspaceAnalysisDatabaseCache,
  saveWorkspaceAnalysisDatabaseCacheAsync,
} from '../../database/cache/storage';
import type { IGraphData } from '../../../../shared/graph/contracts';
import type { IPluginNodeType } from '@codegraphy-dev/plugin-api';
export type {
  WorkspaceIndexCachePatch as WorkspacePipelineCachePatch,
} from '@codegraphy-dev/core';

export async function clearWorkspacePipelineStoredCache(
  workspaceRoot: string | undefined,
  logInfo: (message: string) => void,
): Promise<IWorkspaceAnalysisCache> {
  const cache = createEmptyWorkspaceAnalysisCache();
  if (workspaceRoot) {
    await clearWorkspaceAnalysisDatabaseCacheQueued(workspaceRoot);
  }
  logInfo('[CodeGraphy] Cache cleared');
  return cache;
}

export function persistWorkspacePipelineCache(
  workspaceRoot: string | undefined,
  cache: IWorkspaceAnalysisCache,
  graph: IGraphData,
  warn: (message: string, error: unknown) => void,
  nodeTypes: readonly IPluginNodeType[] = [],
): void {
  if (!workspaceRoot) {
    return;
  }

  void saveWorkspaceAnalysisDatabaseCacheAsync(workspaceRoot, cache, {
    graph,
    ...(nodeTypes.length > 0 ? { nodeTypes } : {}),
  })
    .catch((error: unknown) => {
      warn('[CodeGraphy] Failed to persist repo-local analysis cache.', error);
    });
}

export async function patchWorkspacePipelineCache(
  workspaceRoot: string | undefined,
  cache: IWorkspaceAnalysisCache,
  patch: WorkspacePipelineCachePatch,
  warn: (message: string, error: unknown) => void,
  nodeTypes: readonly IPluginNodeType[] = [],
): Promise<void> {
  if (!workspaceRoot) return;

  const upsertFiles: IWorkspaceAnalysisCache['files'] = {};
  for (const filePath of patch.upsertFilePaths) {
    const entry = cache.files[filePath];
    if (entry) {
      upsertFiles[filePath] = entry;
    }
  }

  try {
    await patchWorkspaceAnalysisDatabaseCache(workspaceRoot, {
      deleteFilePaths: patch.deleteFilePaths,
      ...(patch.deleteNodeIds ? { deleteNodeIds: patch.deleteNodeIds } : {}),
      upsertFiles,
      ...(patch.upsertNodeIds ? { upsertNodeIds: patch.upsertNodeIds } : {}),
      ...(patch.completeGraph
        ? { graph: patch.completeGraph }
        : patch.graph ? { graph: patch.graph } : {}),
      ...(nodeTypes.length > 0 ? { nodeTypes } : {}),
    });
  } catch (error) {
    warn('[CodeGraphy] Failed to patch repo-local analysis cache.', error);
    throw error;
  }
}
