import type {
  GraphViewProviderRefreshMethodsSource,
  RefreshCoordinatorState,
} from './contracts';

export function createRefreshCoordinatorState(): RefreshCoordinatorState {
  return {
    hydratedAnalysisCacheTiers: new Set(),
    indexRefreshPromise: undefined,
  };
}

export function prepareRefreshInputs(source: GraphViewProviderRefreshMethodsSource): void {
  source._loadDisabledRulesAndPlugins();
  source._loadGroupsAndFilterPatterns();
}
