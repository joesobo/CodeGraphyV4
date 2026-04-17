import type { FileDiscovery } from '../../../../core/discovery/file/service';
import type { IGraphData } from '../../../../shared/graph/contracts';
import type { Configuration } from '../../../config/reader';
import type { IWorkspaceAnalysisCache } from '../../cache';
import { rebuildWorkspacePipelineGraphForSource } from '../../analysis/state';
import { runWorkspacePipelineAnalysis } from '../../analysis/run';
import {
  createWorkspacePipelineAnalysisSource,
  createWorkspacePipelineRebuildSource,
  type WorkspacePipelineSourceOwner,
} from '../../analysisSource';

export async function analyzeWorkspacePipeline(
  sourceOwner: WorkspacePipelineSourceOwner,
  cache: IWorkspaceAnalysisCache,
  config: Configuration,
  discovery: FileDiscovery,
  getWorkspaceRoot: () => string | undefined,
  filterPatterns: string[],
  disabledPlugins: Set<string>,
  onProgress: ((progress: { phase: string; current: number; total: number }) => void) | undefined,
  signal: AbortSignal | undefined,
  persistIndexMetadata: () => Promise<void>,
): Promise<IGraphData> {
  const graphData = await runWorkspacePipelineAnalysis(
    createWorkspacePipelineAnalysisSource(sourceOwner),
    cache,
    config,
    discovery,
    getWorkspaceRoot,
    filterPatterns,
    disabledPlugins,
    onProgress,
    signal,
  );

  await persistIndexMetadata();
  return graphData;
}

export function rebuildWorkspacePipelineGraph(
  sourceOwner: WorkspacePipelineSourceOwner,
  disabledPlugins: Set<string>,
  showOrphans: boolean,
): IGraphData {
  return rebuildWorkspacePipelineGraphForSource(
    createWorkspacePipelineRebuildSource(sourceOwner),
    disabledPlugins,
    showOrphans,
  );
}
