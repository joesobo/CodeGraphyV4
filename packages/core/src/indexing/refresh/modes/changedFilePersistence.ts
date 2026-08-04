import type { IGraphData } from '../../../graph/contracts';
import { buildWorkspaceIndexGraphFromRefreshState } from '../graph';
import type { WorkspaceIndexRefreshDependencies, WorkspaceIndexRefreshSource } from '../contracts';

export async function persistChangedFilesCachePatch(
  dependencies: WorkspaceIndexRefreshDependencies,
  patch: {
    deleteFilePaths: readonly string[];
    upsertFilePaths: readonly string[];
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
): Promise<IGraphData> {
  const graph = buildWorkspaceIndexGraphFromRefreshState(
    source,
    dependencies.workspaceRoot,
    dependencies.disabledPlugins,
  );
  await persistChangedFilesCachePatch(dependencies, {
    deleteFilePaths,
    upsertFilePaths: [],
    graph,
  });
  await dependencies.persistIndexMetadata();
  return graph;
}

export function persistMetricOnlyIndexMetadata(
  dependencies: WorkspaceIndexRefreshDependencies,
): Promise<void> | void {
  const persistence = dependencies.persistIndexMetadata();
  if (!dependencies.deferMetricOnlyIndexMetadata) return persistence;
  void persistence.catch(error => dependencies.onDeferredIndexMetadataError?.(error));
}
