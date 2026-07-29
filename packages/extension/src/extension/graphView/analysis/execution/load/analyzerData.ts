import type { IGraphData } from '../../../../../shared/graph/contracts';
import type {
  GraphViewAnalysisExecutionState,
} from '../../execution';
import { EMPTY_GRAPH_DATA } from '../publish';

type GraphViewAnalyzer = NonNullable<GraphViewAnalysisExecutionState['analyzer']>;

export async function loadCachedGraphViewRawData(
  signal: AbortSignal,
  state: GraphViewAnalysisExecutionState,
  analyzer: GraphViewAnalyzer,
): Promise<IGraphData> {
  return (await analyzer.loadCachedGraph?.(
    state.filterPatterns,
    state.disabledPlugins,
    signal,
  )) ?? EMPTY_GRAPH_DATA;
}
