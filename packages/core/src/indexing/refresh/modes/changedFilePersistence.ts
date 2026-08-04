import type { IGraphData } from '../../../graph/contracts';
import { buildWorkspaceIndexGraphFromRefreshState } from '../graph';
import type { WorkspaceIndexRefreshDependencies, WorkspaceIndexRefreshSource } from '../contracts';

export async function persistChangedFilesCachePatch(
  dependencies: WorkspaceIndexRefreshDependencies,
  patch: {
    completeGraph?: IGraphData;
    deleteFilePaths: readonly string[];
    deleteNodeIds?: readonly string[];
    upsertFilePaths: readonly string[];
    upsertNodeIds?: readonly string[];
    graph: IGraphData;
  },
): Promise<void> {
  if (dependencies.persistCachePatch) {
    await dependencies.persistCachePatch(patch);
  } else if (patch.deleteFilePaths.length > 0 || patch.upsertFilePaths.length > 0) {
    await dependencies.persistCache();
  }
}

export async function buildGraphWithoutChangedFileAnalysis(
  source: WorkspaceIndexRefreshSource,
  dependencies: WorkspaceIndexRefreshDependencies,
  deleteFilePaths: readonly string[],
  structuralPatch: {
    deleteNodeIds: readonly string[];
    upsertNodeIds: readonly string[];
  },
): Promise<IGraphData> {
  const graph = buildWorkspaceIndexGraphFromRefreshState(
    source,
    dependencies.workspaceRoot,
    dependencies.disabledPlugins,
  );
  await persistChangedFilesCachePatch(dependencies, {
    ...(source._getCompleteGraphData
      ? { completeGraph: source._getCompleteGraphData() }
      : {}),
    deleteFilePaths,
    deleteNodeIds: structuralPatch.deleteNodeIds,
    upsertFilePaths: [],
    upsertNodeIds: structuralPatch.upsertNodeIds,
    graph,
  });
  await dependencies.persistIndexMetadata(dependencies.filePaths);
  return graph;
}

export function persistMetricOnlyIndexMetadata(
  dependencies: WorkspaceIndexRefreshDependencies,
): Promise<void> | void {
  const persistence = dependencies.persistIndexMetadata(dependencies.filePaths);
  if (!dependencies.deferMetricOnlyIndexMetadata) return persistence;
  void persistence.catch(error => dependencies.onDeferredIndexMetadataError?.(error));
}
