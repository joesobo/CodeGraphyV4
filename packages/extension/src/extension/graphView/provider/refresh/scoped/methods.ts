import {
  BASELINE_ANALYSIS_CACHE_TIER,
  SYMBOLS_ANALYSIS_CACHE_TIER,
  createPluginAnalysisCacheTier,
  type AnalysisCacheTier,
} from '@codegraphy-dev/core';
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

function createRequiredAnalysisCacheTiers(
  tiers: readonly AnalysisCacheTier[],
): AnalysisCacheTier[] {
  return [
    BASELINE_ANALYSIS_CACHE_TIER,
    ...tiers.filter(tier => tier !== BASELINE_ANALYSIS_CACHE_TIER),
  ];
}

function hasHydratedAnalysisCacheTiers(
  state: RefreshCoordinatorState,
  tiers: readonly AnalysisCacheTier[],
): boolean {
  return tiers.every(tier => state.hydratedAnalysisCacheTiers.has(tier));
}

function markHydratedAnalysisCacheTiers(
  state: RefreshCoordinatorState,
  tiers: readonly AnalysisCacheTier[],
): void {
  for (const tier of tiers) {
    state.hydratedAnalysisCacheTiers.add(tier);
  }
}

function createHydrateAnalysisCacheTiersMethod(
  source: GraphViewProviderRefreshMethodsSource,
  state: RefreshCoordinatorState,
  scopedRefreshLifecycle: ScopedRefreshLifecycle,
  tiers: readonly AnalysisCacheTier[],
): () => Promise<boolean> {
  return async (): Promise<boolean> => {
    if (state.indexRefreshPromise) {
      await state.indexRefreshPromise;
    }

    if (hasHydratedAnalysisCacheTiers(state, tiers)) {
      return true;
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
          requiredAnalysisCacheTiers: createRequiredAnalysisCacheTiers(tiers),
          warmAnalysis: false,
        },
      ),
      scopedRefreshLifecycle,
    );
    if (!hasGraphData(graphData)) {
      return false;
    }

    publishGraphDataIfPresent(source, graphData);
    markHydratedAnalysisCacheTiers(state, tiers);
    return true;
  };
}

export function createHydrateGraphScopeMethod(
  source: GraphViewProviderRefreshMethodsSource,
  state: RefreshCoordinatorState,
  scopedRefreshLifecycle: ScopedRefreshLifecycle,
): () => Promise<boolean> {
  return createHydrateAnalysisCacheTiersMethod(
    source,
    state,
    scopedRefreshLifecycle,
    [SYMBOLS_ANALYSIS_CACHE_TIER],
  );
}

export function createHydratePluginGraphScopeMethod(
  source: GraphViewProviderRefreshMethodsSource,
  state: RefreshCoordinatorState,
  scopedRefreshLifecycle: ScopedRefreshLifecycle,
): (pluginIds: readonly string[]) => Promise<boolean> {
  return async (pluginIds: readonly string[]): Promise<boolean> => {
    const tiers = pluginIds.map(createPluginAnalysisCacheTier);
    if (tiers.length === 0) {
      return true;
    }

    return createHydrateAnalysisCacheTiersMethod(
      source,
      state,
      scopedRefreshLifecycle,
      tiers,
    )();
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
    if (hasGraphData(graphData)) {
      markHydratedAnalysisCacheTiers(state, [SYMBOLS_ANALYSIS_CACHE_TIER]);
    }
  };
}

export function createRefreshGitignoreMetadataMethod(
  source: GraphViewProviderRefreshMethodsSource,
  state: RefreshCoordinatorState,
  refresh: () => Promise<void>,
  refreshIndex: () => Promise<void>,
  scopedRefreshLifecycle: ScopedRefreshLifecycle,
): () => Promise<void> {
  return async (): Promise<void> => {
    if (state.indexRefreshPromise) {
      await state.indexRefreshPromise;
    }

    if (!source._analyzer?.refreshGitignoreMetadata) {
      prepareRefreshInputs(source);
      await refreshIndex();
      return;
    }

    if (!source._analyzer.hasIndex()) {
      await refresh();
      return;
    }

    prepareRefreshInputs(source);
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
    if (hasGraphData(graphData)) {
      markHydratedAnalysisCacheTiers(
        state,
        pluginIds.map(createPluginAnalysisCacheTier),
      );
    }
  };
}
