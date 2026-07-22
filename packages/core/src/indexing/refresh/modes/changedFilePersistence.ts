import type { IGraphData } from '../../../graph/contracts';
import { buildWorkspaceIndexGraphFromRefreshState } from '../graph';
import type { WorkspaceIndexRefreshDependencies, WorkspaceIndexRefreshSource } from '../contracts';

export function persistChangedFilesCachePatch(
  dependencies: WorkspaceIndexRefreshDependencies,
  patch: { deleteFilePaths: readonly string[]; upsertFilePaths: readonly string[] },
): void {
  if (dependencies.persistCachePatch) dependencies.persistCachePatch(patch);
  else dependencies.persistCache();
}

export async function buildGraphWithoutChangedFileAnalysis(
  source: WorkspaceIndexRefreshSource,
  dependencies: WorkspaceIndexRefreshDependencies,
  deleteFilePaths: readonly string[],
): Promise<IGraphData> {
  if (deleteFilePaths.length > 0) {
    persistChangedFilesCachePatch(dependencies, { deleteFilePaths, upsertFilePaths: [] });
    await dependencies.persistIndexMetadata();
  }
  return buildWorkspaceIndexGraphFromRefreshState(
    source,
    dependencies.workspaceRoot,
    dependencies.disabledPlugins,
  );
}

export function persistMetricOnlyIndexMetadata(
  dependencies: WorkspaceIndexRefreshDependencies,
): Promise<void> | void {
  const persistence = dependencies.persistIndexMetadata();
  if (!dependencies.deferMetricOnlyIndexMetadata) return persistence;
  void persistence.catch(error => dependencies.onDeferredIndexMetadataError?.(error));
}
