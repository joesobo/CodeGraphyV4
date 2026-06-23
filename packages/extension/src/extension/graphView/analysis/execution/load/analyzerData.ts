import type { IGraphData } from '../../../../../shared/graph/contracts';
import type {
  GraphViewCachedGraphLoadOptions,
  GraphViewAnalysisExecutionState,
  GraphViewIndexingProgress,
} from '../../execution';
import { EMPTY_GRAPH_DATA } from '../publish';

type GraphViewAnalyzer = NonNullable<GraphViewAnalysisExecutionState['analyzer']>;

export async function discoverGraphViewRawData(
  signal: AbortSignal,
  state: GraphViewAnalysisExecutionState,
  analyzer: GraphViewAnalyzer,
): Promise<IGraphData> {
  return (await analyzer.discoverGraph?.(
    state.filterPatterns,
    state.disabledPlugins,
    signal,
  )) ?? EMPTY_GRAPH_DATA;
}

export async function analyzeGraphViewRawData(
  signal: AbortSignal,
  state: GraphViewAnalysisExecutionState,
  analyzer: GraphViewAnalyzer,
  forwardProgress: (progress: GraphViewIndexingProgress) => void,
): Promise<IGraphData> {
  return (await analyzer.analyze?.(
    state.filterPatterns,
    state.disabledPlugins,
    signal,
    forwardProgress,
  )) ?? EMPTY_GRAPH_DATA;
}

export async function loadCachedGraphViewRawData(
  signal: AbortSignal,
  state: GraphViewAnalysisExecutionState,
  analyzer: GraphViewAnalyzer,
  options?: GraphViewCachedGraphLoadOptions,
): Promise<IGraphData> {
  return (await analyzer.loadCachedGraph?.(
    state.filterPatterns,
    state.disabledPlugins,
    signal,
    options,
  )) ?? EMPTY_GRAPH_DATA;
}
