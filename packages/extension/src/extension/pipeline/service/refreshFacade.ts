import type { IGraphData } from '../../../shared/graph/contracts';
import { captureActivePerfMetricEmitter } from '@codegraphy-dev/core';
import { WorkspacePipelineDiscoveryFacade } from './discoveryFacade';
import { getCachedGitHistoryChurnCounts } from '../../gitHistory/cache/state';
import { createGitHistoryPluginSignature } from '../../gitHistory/pluginSignature';
import { refreshAnalysisScopeForFacade } from './refresh/modes/analysisScope';
import { refreshChangedFilesForFacade } from './refresh/modes/changedFiles';
import type { RefreshFacadeContext } from './refresh/context';
import { refreshGitignoreMetadataForFacade } from './refresh/modes/gitignoreMetadata';
import { patchGraphDataNodeMetrics } from './refresh/metrics';
import { refreshPluginFilesForFacade } from './refresh/modes/pluginFiles';

function runMeasuredIncrementalRefresh(
  dimension: string,
  refresh: () => Promise<IGraphData>,
): Promise<IGraphData> {
  const emitMetric = captureActivePerfMetricEmitter();
  if (!emitMetric) {
    return refresh();
  }

  const startedAt = performance.now();
  return refresh().finally(() => {
    emitMetric({
      metric: 'incrementalRefreshMs',
      value: performance.now() - startedAt,
      unit: 'ms',
      dimension,
    });
  });
}

export abstract class WorkspacePipelineRefreshFacade extends WorkspacePipelineDiscoveryFacade {
  protected _patchGraphDataNodeMetrics(
    graphData: IGraphData,
    filePaths: readonly string[],
  ): IGraphData {
    const churnCounts = getCachedGitHistoryChurnCounts(
      this._context.workspaceState,
      createGitHistoryPluginSignature(this._registry),
    ) ?? {};
    return patchGraphDataNodeMetrics({
      churnCounts,
      filePaths,
      fileSizes: this._cache.files,
      graphData,
    });
  }

  async refreshAnalysisScope(
    filterPatterns: string[] = [],
    disabledPlugins: Set<string> = new Set(),
    signal?: AbortSignal,
    onProgress?: (progress: { phase: string; current: number; total: number }) => void,
  ): Promise<IGraphData> {
    return runMeasuredIncrementalRefresh('analysis-scope', () =>
      refreshAnalysisScopeForFacade(this as unknown as RefreshFacadeContext, {
        disabledPlugins,
        filterPatterns,
        onProgress,
        signal,
      }));
  }

  async refreshPluginFiles(
    pluginIds: readonly string[],
    filterPatterns: string[] = [],
    disabledPlugins: Set<string> = new Set(),
    signal?: AbortSignal,
    onProgress?: (progress: { phase: string; current: number; total: number }) => void,
  ): Promise<IGraphData> {
    return runMeasuredIncrementalRefresh('plugin-files', () =>
      refreshPluginFilesForFacade(this as unknown as RefreshFacadeContext, {
        disabledPlugins,
        filterPatterns,
        onProgress,
        pluginIds,
        signal,
      }));
  }

  async refreshChangedFiles(
    filePaths: readonly string[],
    filterPatterns: string[] = [],
    disabledPlugins: Set<string> = new Set(),
    signal?: AbortSignal,
    onProgress?: (progress: { phase: string; current: number; total: number }) => void,
  ): Promise<IGraphData> {
    return runMeasuredIncrementalRefresh('changed-files', () =>
      refreshChangedFilesForFacade(this as unknown as RefreshFacadeContext, {
        disabledPlugins,
        filePaths,
        filterPatterns,
        onProgress,
        signal,
      }));
  }

  async refreshGitignoreMetadata(
    filterPatterns: string[] = [],
    disabledPlugins: Set<string> = new Set(),
    signal?: AbortSignal,
  ): Promise<IGraphData> {
    return runMeasuredIncrementalRefresh('gitignore-metadata', () =>
      refreshGitignoreMetadataForFacade(this as unknown as RefreshFacadeContext, {
        disabledPlugins,
        filterPatterns,
        signal,
      }));
  }

  abstract invalidateWorkspaceFiles(
    filePaths: readonly string[],
    options?: { persist?: boolean },
  ): string[];
}
