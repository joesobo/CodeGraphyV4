import {
  createGraphViewProviderRefreshMethods as createGraphViewProviderRefreshMethodsImpl,
} from './refresh/factory';
import type {
  GraphViewProviderRefreshMethodDependencies,
  GraphViewProviderRefreshMethods,
  GraphViewProviderRefreshMethodsSource,
} from './refresh/contracts';
import { DEFAULT_DEPENDENCIES } from './refresh/defaults';

export type {
  GraphViewProviderRefreshAnalyzerLike,
  GraphViewProviderRefreshMethodDependencies,
  GraphViewProviderRefreshMethods,
  GraphViewProviderRefreshMethodsSource,
  GraphViewScopedRefreshProgress,
  RefreshCoordinatorState,
  ScopedRefreshLifecycle,
} from './refresh/contracts';
export { DEFAULT_DEPENDENCIES } from './refresh/defaults';

export function createGraphViewProviderRefreshMethods(
  source: GraphViewProviderRefreshMethodsSource,
  dependencies: GraphViewProviderRefreshMethodDependencies = DEFAULT_DEPENDENCIES,
): GraphViewProviderRefreshMethods {
  return createGraphViewProviderRefreshMethodsImpl(source, dependencies);
}
