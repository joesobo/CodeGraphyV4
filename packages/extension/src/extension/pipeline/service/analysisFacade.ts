import type { IGraphData } from '../../../shared/graph/contracts';
import type { WorkspacePipelineSourceOwner } from '../analysisSource';
import { createEmptyWorkspaceAnalysisCache } from '../cache';
import { WorkspacePipelineGraphDiscoveryFacade } from './graphDiscovery';
import {
  analyzeWorkspacePipeline,
  rebuildWorkspacePipelineGraph,
} from './runtime/run';

export abstract class WorkspacePipelineAnalysisFacade extends WorkspacePipelineGraphDiscoveryFacade {
  async analyze(
    filterPatterns: string[] = [],
    disabledPlugins: Set<string> = new Set(),
    signal?: AbortSignal,
    onProgress?: (progress: { phase: string; current: number; total: number }) => void,
  ): Promise<IGraphData> {
    return analyzeWorkspacePipeline(
      this as unknown as WorkspacePipelineSourceOwner,
      this._cache,
      this._config,
      this._discovery,
      () => this._getWorkspaceRoot(),
      this._getEffectiveCustomFilterPatterns(filterPatterns),
      disabledPlugins,
      onProgress,
      signal,
      async () => this._persistIndexMetadata(),
    );
  }

  rebuildGraph(disabledPlugins: Set<string>, showOrphans: boolean): IGraphData {
    return rebuildWorkspacePipelineGraph(
      this as unknown as WorkspacePipelineSourceOwner,
      disabledPlugins,
      showOrphans,
    );
  }

  protected resetCacheForIndexRefresh(): void {
    this._cache = createEmptyWorkspaceAnalysisCache();
    console.log('[CodeGraphy] Cache cleared');
  }

  async refreshIndex(
    filterPatterns: string[] = [],
    disabledPlugins: Set<string> = new Set(),
    signal?: AbortSignal,
    onProgress?: (progress: { phase: string; current: number; total: number }) => void,
  ): Promise<IGraphData> {
    this.resetCacheForIndexRefresh();
    return this.analyze(filterPatterns, disabledPlugins, signal, progress => {
      onProgress?.({
        ...progress,
        phase: progress.phase || 'Refreshing Index',
      });
    });
  }
}
