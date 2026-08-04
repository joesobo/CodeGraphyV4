import type { IGraphData } from '../../../shared/graph/contracts';
import type { WorkspacePipelineSourceOwner } from '../analysisSource';
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
    const workspaceRoot = this._getWorkspaceRoot();
    const graphData = await analyzeWorkspacePipeline(
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
    if (workspaceRoot && this._lastWorkspaceRoot === workspaceRoot) {
      this._markRecoverableGraphState(workspaceRoot);
    }
    return graphData;
  }

  rebuildGraph(disabledPlugins: Set<string>, showOrphans: boolean): IGraphData {
    return rebuildWorkspacePipelineGraph(
      this as unknown as WorkspacePipelineSourceOwner,
      disabledPlugins,
      showOrphans,
    );
  }

  async refreshIndex(
    filterPatterns: string[] = [],
    disabledPlugins: Set<string> = new Set(),
    signal?: AbortSignal,
    onProgress?: (progress: { phase: string; current: number; total: number }) => void,
  ): Promise<IGraphData> {
    return this.analyze(filterPatterns, disabledPlugins, signal, progress => {
      onProgress?.({
        ...progress,
        phase: progress.phase || 'Refreshing Index',
      });
    });
  }
}
