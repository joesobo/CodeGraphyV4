import type { IGraphData } from '../../../../shared/graph/contracts';
import type {
  GraphViewAnalysisExecutionState,
  GraphViewIndexingProgress,
} from '../execution';
import { EMPTY_GRAPH_DATA } from './publish';

export async function refreshGraphViewRawData(
  signal: AbortSignal,
  state: GraphViewAnalysisExecutionState,
  forwardProgress: (progress: GraphViewIndexingProgress) => void,
): Promise<IGraphData> {
  const analyzer = state.analyzer;
  if (!analyzer) {
    return EMPTY_GRAPH_DATA;
  }

  if (analyzer.refreshIndex) {
    return (await analyzer.refreshIndex(
      state.filterPatterns,
      state.disabledPlugins,
      signal,
      forwardProgress,
    )) ?? EMPTY_GRAPH_DATA;
  }

  return (await analyzer.analyze?.(
    state.filterPatterns,
    state.disabledPlugins,
    signal,
    forwardProgress,
  )) ?? EMPTY_GRAPH_DATA;
}

export async function refreshIncrementalGraphViewRawData(
  signal: AbortSignal,
  state: GraphViewAnalysisExecutionState,
  forwardProgress: (progress: GraphViewIndexingProgress) => void,
): Promise<IGraphData> {
  if (state.analyzer?.refreshChangedFiles) {
    return (
      (await state.analyzer.refreshChangedFiles(
        state.changedFilePaths ?? [],
        state.filterPatterns,
        state.disabledPlugins,
        signal,
        forwardProgress,
      )) ?? EMPTY_GRAPH_DATA
    );
  }

  return (await state.analyzer?.analyze(
    state.filterPatterns,
    state.disabledPlugins,
    signal,
    forwardProgress,
  )) ?? EMPTY_GRAPH_DATA;
}
