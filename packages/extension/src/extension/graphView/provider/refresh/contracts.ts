import type { IGraphData } from '../../../../shared/graph/contracts';
import type { ExtensionToWebviewMessage } from '../../../../shared/protocol/extensionToWebview';
import type { rebuildGraphViewData, smartRebuildGraphView } from '../../view/rebuild';
import type { AnalysisCacheTier } from '@codegraphy-dev/core';
import type { CodeGraphyIndexFreshness } from '../../../repoSettings/freshness';

export type GraphViewScopedRefreshProgress = { phase: string; current: number; total: number };

export interface GraphViewProviderRefreshAnalyzerLike {
  hasIndex(): boolean;
  getIndexStatus?(): {
    freshness: CodeGraphyIndexFreshness;
    detail: string;
  };
  rebuildGraph(
    disabledPlugins: Set<string>,
    showOrphans: boolean,
  ): IGraphData;
  loadCachedGraph?(
    filterPatterns?: string[],
    disabledPlugins?: Set<string>,
    signal?: AbortSignal,
    options?: {
      forceReloadGraphCache?: boolean;
      requiredAnalysisCacheTiers?: readonly AnalysisCacheTier[];
    },
  ): Promise<IGraphData>;
  registry: {
    notifyGraphRebuild(
      graphData: IGraphData,
      disabledPlugins?: ReadonlySet<string>,
    ): void;
  };
  clearCache(): void;
}

export interface RefreshCoordinatorState {
  hydratedAnalysisCacheTiers: Set<AnalysisCacheTier>;
  indexRefreshPromise: Promise<void> | undefined;
}

export interface ScopedRefreshLifecycle {
  setController(controller: AbortController): void;
  clearController(controller: AbortController): void;
  abort(): void;
}

export interface GraphViewProviderRefreshMethodsSource {
  _analyzer: GraphViewProviderRefreshAnalyzerLike | undefined;
  _analysisController?: AbortController;
  _analysisRequestId: number;
  _disabledPlugins: Set<string>;
  _filterPatterns: string[];
  _rawGraphData: IGraphData;
  _graphData: IGraphData;
  _loadDisabledRulesAndPlugins(): boolean;
  _loadGroupsAndFilterPatterns(): void;
  _loadAndSendData(): Promise<void>;
  _refreshAndSendData(): Promise<void>;
  _sendAllSettings(): void;
  _sendFavorites(favorites?: string[]): void;
  _computeMergedGroups(): void;
  _sendGroupsUpdated(): void;
  _sendGraphControls?(): void;
  _sendSettings(): void;
  _sendPhysicsSettings(): void;
  _updateViewContext(): void;
  _applyViewTransform(): void;
  _sendDepthState(): void;
  _sendPluginStatuses(): void;
  _sendDecorations(): void;
  _sendMessage(message: ExtensionToWebviewMessage): void;
  _rebuildAndSend?(this: void): void;
}

export interface GraphViewProviderRefreshMethods {
  refresh(): Promise<void>;
  refreshIndex(): Promise<void>;
  hydrateGraphScope(): Promise<boolean>;
  hydratePluginGraphScope(pluginIds: readonly string[]): Promise<boolean>;
  refreshGroupSettings(): void;
  refreshPhysicsSettings(): void;
  refreshSettings(): void;
  refreshToggleSettings(): void;
  clearCacheAndRefresh(): Promise<void>;
  _rebuildAndSend(): void;
  _smartRebuild(id: string): void;
}

export interface GraphViewProviderRefreshMethodDependencies {
  getShowOrphans(): boolean;
  rebuildGraphData: typeof rebuildGraphViewData;
  smartRebuildGraphData: typeof smartRebuildGraphView;
}
