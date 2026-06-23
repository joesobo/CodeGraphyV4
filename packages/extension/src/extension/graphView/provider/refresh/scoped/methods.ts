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
    publishGraphDataIfPresent(source, graphData, 'analysisScope');
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
    publishGraphDataIfPresent(source, graphData, 'gitignoreMetadata');
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
    publishGraphDataIfPresent(source, graphData, 'pluginFiles');
  };
}
