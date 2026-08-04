import { createRebuildSenders } from './rebuild';
import type {
  GraphViewProviderRefreshMethodDependencies,
  GraphViewProviderRefreshMethods,
  GraphViewProviderRefreshMethodsSource,
} from './contracts';
import { createRefreshCoordinatorState } from './coordinator';
import { DEFAULT_DEPENDENCIES } from './defaults';
import {
  createRefreshIndexMethod,
  createRefreshMethod,
} from './requests/methods';
import { createScopedRefreshLifecycle } from './scoped/lifecycle';
import {
  createHydrateGraphScopeMethod,
  createHydratePluginGraphScopeMethod,
} from './scoped/methods';

export function createGraphViewProviderRefreshMethods(
  source: GraphViewProviderRefreshMethodsSource,
  dependencies: GraphViewProviderRefreshMethodDependencies = DEFAULT_DEPENDENCIES,
): GraphViewProviderRefreshMethods {
  const rebuildSenders = createRebuildSenders(source, dependencies);
  const _rebuildAndSend = (): void => rebuildSenders.rebuildAndSend();
  const scopedRefreshLifecycle = createScopedRefreshLifecycle();
  const _smartRebuild = (id: string): void => {
    scopedRefreshLifecycle.abort();
    rebuildSenders.smartRebuild(id);
  };
  const state = createRefreshCoordinatorState();
  const refresh = createRefreshMethod(source, state);
  const refreshIndex = createRefreshIndexMethod(
    source,
    state,
    () => scopedRefreshLifecycle.abort(),
  );
  const hydrateGraphScope = createHydrateGraphScopeMethod(
    source,
    state,
    scopedRefreshLifecycle,
  );
  const hydratePluginGraphScope = createHydratePluginGraphScopeMethod(
    source,
    state,
    scopedRefreshLifecycle,
  );
  return {
    refresh,
    refreshIndex,
    hydrateGraphScope,
    hydratePluginGraphScope,
    refreshGroupSettings: () => {
      source._loadGroupsAndFilterPatterns();
      source._sendGroupsUpdated();
    },
    refreshPhysicsSettings: () => {
      source._sendPhysicsSettings();
    },
    refreshSettings: () => {
      source._sendSettings();
      source._sendGraphControls?.();
    },
    refreshToggleSettings: () => {
      if (!source._loadDisabledRulesAndPlugins()) return;
      scopedRefreshLifecycle.abort();
      (source._rebuildAndSend ?? _rebuildAndSend)();
    },
    clearCacheAndRefresh: async () => {
      await source._analyzer?.clearCache();
      state.hydratedAnalysisCacheTiers.clear();
      await refreshIndex();
    },
    _rebuildAndSend,
    _smartRebuild,
  };
}
