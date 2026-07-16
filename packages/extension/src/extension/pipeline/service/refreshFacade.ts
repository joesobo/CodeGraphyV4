import type { IGraphData } from '../../../shared/graph/contracts';
import { WorkspacePipelineDiscoveryFacade } from './discoveryFacade';
import { refreshAnalysisScopeForFacade } from './refresh/modes/analysisScope';
import { refreshChangedFilesForFacade } from './refresh/modes/changedFiles';
import type { RefreshFacadeContext } from './refresh/context';
import { refreshGitignoreMetadataForFacade } from './refresh/modes/gitignoreMetadata';
import { patchGraphDataNodeMetrics } from './refresh/metrics';
import { refreshPluginFilesForFacade } from './refresh/modes/pluginFiles';

export abstract class WorkspacePipelineRefreshFacade extends WorkspacePipelineDiscoveryFacade {
  protected _patchGraphDataNodeMetrics(
    graphData: IGraphData,
    filePaths: readonly string[],
  ): IGraphData {
    return patchGraphDataNodeMetrics({
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
    return refreshAnalysisScopeForFacade(this as unknown as RefreshFacadeContext, {
      disabledPlugins,
      filterPatterns,
      onProgress,
      signal,
    });
  }

  async refreshPluginFiles(
    pluginIds: readonly string[],
    filterPatterns: string[] = [],
    disabledPlugins: Set<string> = new Set(),
    signal?: AbortSignal,
    onProgress?: (progress: { phase: string; current: number; total: number }) => void,
  ): Promise<IGraphData> {
    return refreshPluginFilesForFacade(this as unknown as RefreshFacadeContext, {
      disabledPlugins,
      filterPatterns,
      onProgress,
      pluginIds,
      signal,
    });
  }

  async refreshChangedFiles(
    filePaths: readonly string[],
    filterPatterns: string[] = [],
    disabledPlugins: Set<string> = new Set(),
    signal?: AbortSignal,
    onProgress?: (progress: { phase: string; current: number; total: number }) => void,
  ): Promise<IGraphData> {
    return refreshChangedFilesForFacade(this as unknown as RefreshFacadeContext, {
      disabledPlugins,
      filePaths,
      filterPatterns,
      onProgress,
      signal,
    });
  }

  async refreshGitignoreMetadata(
    filterPatterns: string[] = [],
    disabledPlugins: Set<string> = new Set(),
    signal?: AbortSignal,
  ): Promise<IGraphData> {
    return refreshGitignoreMetadataForFacade(this as unknown as RefreshFacadeContext, {
      disabledPlugins,
      filterPatterns,
      signal,
    });
  }

  abstract invalidateWorkspaceFiles(
    filePaths: readonly string[],
    options?: { persist?: boolean },
  ): string[];
}
