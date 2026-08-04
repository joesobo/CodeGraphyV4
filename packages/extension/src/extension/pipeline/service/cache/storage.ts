import {
  createEmptyWorkspaceAnalysisCache,
  type IWorkspaceAnalysisCache,
} from '../../cache';
import {
  clearWorkspaceAnalysisDatabaseCacheQueued,
  patchWorkspaceAnalysisDatabaseCache,
  saveWorkspaceAnalysisDatabaseCacheAsync,
} from '../../database/cache/storage';
import type { IGraphData } from '../../../../shared/graph/contracts';
import type { IPluginNodeType } from '@codegraphy-dev/plugin-api';

export interface WorkspacePipelineCachePatch {
  deleteFilePaths: readonly string[];
  deleteNodeIds?: readonly string[];
  upsertFilePaths: readonly string[];
  upsertNodeIds?: readonly string[];
  graph?: IGraphData;
}

export function clearWorkspacePipelineStoredCache(
  workspaceRoot: string | undefined,
  logInfo: (message: string) => void,
): IWorkspaceAnalysisCache {
  const cache = createEmptyWorkspaceAnalysisCache();
  if (workspaceRoot) {
    void clearWorkspaceAnalysisDatabaseCacheQueued(workspaceRoot)
      .catch((error: unknown) => {
        console.warn('[CodeGraphy] Failed to clear repo-local analysis cache.', error);
      });
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
      ...(patch.graph ? { graph: patch.graph } : {}),
      ...(nodeTypes.length > 0 ? { nodeTypes } : {}),
    });
  } catch (error) {
    warn('[CodeGraphy] Failed to patch repo-local analysis cache.', error);
    throw error;
  }
}
