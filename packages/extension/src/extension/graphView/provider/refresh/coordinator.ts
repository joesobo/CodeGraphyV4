import type {
  GraphViewProviderRefreshMethodsSource,
  RefreshCoordinatorState,
} from './contracts';
import { canRunIncrementalChangedFileRefresh } from './run';

export function createRefreshCoordinatorState(): RefreshCoordinatorState {
  return {
    hydratedAnalysisCacheTiers: new Set(),
    indexRefreshPromise: undefined,
    queuedChangedFilePaths: new Set<string>(),
  };
}

export function prepareRefreshInputs(source: GraphViewProviderRefreshMethodsSource): void {
  source._loadDisabledRulesAndPlugins();
  source._loadGroupsAndFilterPatterns();
}

export function canRunIndexedChangedFileRefresh(
  source: GraphViewProviderRefreshMethodsSource,
): boolean {
  return canRunIncrementalChangedFileRefresh(source);
}
