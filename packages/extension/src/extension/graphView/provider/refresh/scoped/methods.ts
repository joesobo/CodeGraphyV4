import type { IGraphData } from '../../../../../shared/graph/contracts';
import type {
  GraphViewProviderRefreshMethodsSource,
  RefreshCoordinatorState,
  ScopedRefreshLifecycle,
} from '../contracts';
import { prepareRefreshInputs } from '../coordinator';
import {
  publishGraphDataIfPresent,
  runScopedRefreshRequest,
} from './lifecycle';

function hasGraphData(graphData: IGraphData | undefined): graphData is IGraphData {
  return (graphData?.nodes.length ?? 0) > 0 || (graphData?.edges.length ?? 0) > 0;
}

export function createHydrateGraphScopeMethod(
  source: GraphViewProviderRefreshMethodsSource,
  state: RefreshCoordinatorState,
  scopedRefreshLifecycle: ScopedRefreshLifecycle,
): () => Promise<boolean> {
  return async (): Promise<boolean> => {
    if (state.indexRefreshPromise) {
      await state.indexRefreshPromise;
    }

    prepareRefreshInputs(source);
    if (!source._analyzer?.loadCachedGraph) {
      return false;
    }

    const graphData = await runScopedRefreshRequest(
      source,
      signal => source._analyzer!.loadCachedGraph!(
        source._filterPatterns,
        source._disabledPlugins,
        signal,
        {
          includeCurrentGitignoreMetadata: true,
          warmAnalysis: false,
        },
      ),
      scopedRefreshLifecycle,
    );
    if (!hasGraphData(graphData)) {
      return false;
    }

    publishGraphDataIfPresent(source, graphData);
    return true;
  };
}

export function createRefreshAnalysisScopeMethod(
  source: GraphViewProviderRefreshMethodsSource,
  state: RefreshCoordinatorState,
  refresh: () => Promise<void>,
  scopedRefreshLifecycle: ScopedRefreshLifecycle,
): () => Promise<void> {
  return async (): Promise<void> => {
    if (state.indexRefreshPromise) {
      await state.indexRefreshPromise;
    }

    prepareRefreshInputs(source);
    if (!source._analyzer?.hasIndex() || !source._analyzer.refreshAnalysisScope) {
      await refresh();
      return;
    }

    const graphData = await runScopedRefreshRequest(
      source,
      (signal, onProgress) => source._analyzer!.refreshAnalysisScope!(
        source._filterPatterns,
        source._disabledPlugins,
        signal,
        onProgress,
      ),
      scopedRefreshLifecycle,
    );
    publishGraphDataIfPresent(source, graphData);
  };
}

export function createRefreshGitignoreMetadataMethod(
  source: GraphViewProviderRefreshMethodsSource,
  state: RefreshCoordinatorState,
  refreshIndex: () => Promise<void>,
  scopedRefreshLifecycle: ScopedRefreshLifecycle,
): () => Promise<void> {
  return async (): Promise<void> => {
    if (state.indexRefreshPromise) {
      await state.indexRefreshPromise;
    }

    prepareRefreshInputs(source);
    if (!source._analyzer?.refreshGitignoreMetadata) {
      await refreshIndex();
      return;
    }

    const graphData = await runScopedRefreshRequest(
      source,
      signal => source._analyzer!.refreshGitignoreMetadata!(
        source._filterPatterns,
        source._disabledPlugins,
        signal,
      ),
      scopedRefreshLifecycle,
    );
    publishGraphDataIfPresent(source, graphData);
  };
}

export function createRefreshPluginFilesMethod(
  source: GraphViewProviderRefreshMethodsSource,
  state: RefreshCoordinatorState,
  refresh: () => Promise<void>,
  scopedRefreshLifecycle: ScopedRefreshLifecycle,
): (pluginIds: readonly string[]) => Promise<void> {
  return async (pluginIds: readonly string[]): Promise<void> => {
    if (state.indexRefreshPromise) {
      await state.indexRefreshPromise;
    }

    prepareRefreshInputs(source);
    if (!source._analyzer?.refreshPluginFiles) {
      await refresh();
      return;
    }

    const graphData = await runScopedRefreshRequest(
      source,
      (signal, onProgress) => source._analyzer!.refreshPluginFiles!(
        pluginIds,
        source._filterPatterns,
        source._disabledPlugins,
        signal,
        onProgress,
      ),
      scopedRefreshLifecycle,
    );
    publishGraphDataIfPresent(source, graphData);
  };
}
