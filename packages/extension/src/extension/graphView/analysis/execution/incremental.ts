import type { IGraphData } from '../../../../shared/graph/contracts';
import type {
  GraphViewAnalysisExecutionState,
  GraphViewIndexingProgress,
} from '../execution';
import { EMPTY_GRAPH_DATA } from './publish';

export async function refreshGraphViewChangedFiles(
  signal: AbortSignal,
  state: GraphViewAnalysisExecutionState,
  forwardProgress: (progress: GraphViewIndexingProgress) => void,
): Promise<IGraphData> {
  const analyzer = state.analyzer;
  if (!analyzer?.refreshChangedFiles) {
    return EMPTY_GRAPH_DATA;
  }

  if (!analyzer.hasLoadedGraphState?.() || !analyzer.hasRecoverableGraphState()) {
    await analyzer.loadCachedGraph?.(
      state.filterPatterns,
      state.disabledPlugins,
      signal,
    );
  }

  if (!analyzer.hasRecoverableGraphState()) {
    throw new Error('Graph Cache became unavailable before targeted Indexing could start.');
  }

  return analyzer.refreshChangedFiles(
    state.changedFilePaths ?? [],
    state.filterPatterns,
    state.disabledPlugins,
    signal,
    forwardProgress,
  );
}
