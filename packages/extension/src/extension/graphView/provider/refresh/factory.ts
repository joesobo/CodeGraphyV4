import { createRebuildSenders } from './rebuild';
import type {
  GraphViewProviderRefreshMethodDependencies,
  GraphViewProviderRefreshMethods,
  GraphViewProviderRefreshMethodsSource,
} from './contracts';
import { createRefreshCoordinatorState } from './coordinator';
import { DEFAULT_DEPENDENCIES } from './defaults';
import {
  createRefreshChangedFilesMethod,
  createRefreshIndexMethod,
  createRefreshMethod,
} from './requests/methods';
import { createScopedRefreshLifecycle } from './scoped/lifecycle';
import {
  createHydrateGraphScopeMethod,
  createHydratePluginGraphScopeMethod,
  createRefreshAnalysisScopeMethod,
  createRefreshGitignoreMetadataMethod,
  createRefreshPluginFilesMethod,
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
  const refreshChangedFiles = createRefreshChangedFilesMethod(source, state);
  const refreshIndex = createRefreshIndexMethod(
    source,
    state,
    refreshChangedFiles,
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
  const refreshAnalysisScope = createRefreshAnalysisScopeMethod(
    source,
    state,
    refresh,
    scopedRefreshLifecycle,
  );
  const refreshGitignoreMetadata = createRefreshGitignoreMetadataMethod(
    source,
    state,
    refresh,
    refreshIndex,
    scopedRefreshLifecycle,
  );
  const refreshPluginFiles = createRefreshPluginFilesMethod(
    source,
    state,
    refresh,
    scopedRefreshLifecycle,
  );

  return {
    refresh,
    refreshIndex,
    refreshGitignoreMetadata,
    hydrateGraphScope,
    hydratePluginGraphScope,
    refreshAnalysisScope,
    refreshPluginFiles,
    refreshChangedFiles,
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
      source._analyzer?.clearCache();
      await refreshIndex();
    },
    _rebuildAndSend,
    _smartRebuild,
  };
}
