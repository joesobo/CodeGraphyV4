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
      requiredAnalysisCacheTiers?: readonly AnalysisCacheTier[];
      warmAnalysis?: boolean;
    },
  ): Promise<IGraphData>;
  registry: {
    notifyGraphRebuild(
      graphData: IGraphData,
      disabledPlugins?: ReadonlySet<string>,
    ): void;
  };
  clearCache(): void;
  refreshAnalysisScope?(
    filterPatterns?: string[],
    disabledPlugins?: Set<string>,
    signal?: AbortSignal,
    onProgress?: (progress: GraphViewScopedRefreshProgress) => void,
  ): Promise<IGraphData>;
  refreshPluginFiles?(
    pluginIds: readonly string[],
    filterPatterns?: string[],
    disabledPlugins?: Set<string>,
    signal?: AbortSignal,
    onProgress?: (progress: GraphViewScopedRefreshProgress) => void,
  ): Promise<IGraphData>;
  refreshGitignoreMetadata?(
    filterPatterns?: string[],
    disabledPlugins?: Set<string>,
    signal?: AbortSignal,
  ): Promise<IGraphData>;
}

export interface RefreshCoordinatorState {
  hydratedAnalysisCacheTiers: Set<AnalysisCacheTier>;
  indexRefreshPromise: Promise<void> | undefined;
  queuedChangedFilePaths: Set<string>;
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
  _loadAndSendData?(): Promise<void>;
  _analyzeAndSendData(): Promise<void>;
  _refreshAndSendData?(): Promise<void>;
  _incrementalAnalyzeAndSendData?(filePaths: readonly string[]): Promise<void>;
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
  refreshGitignoreMetadata(): Promise<void>;
  hydrateGraphScope(): Promise<boolean>;
  hydratePluginGraphScope(pluginIds: readonly string[]): Promise<boolean>;
  refreshAnalysisScope(): Promise<void>;
  refreshPluginFiles(pluginIds: readonly string[]): Promise<void>;
  refreshChangedFiles(filePaths: readonly string[]): Promise<void>;
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
