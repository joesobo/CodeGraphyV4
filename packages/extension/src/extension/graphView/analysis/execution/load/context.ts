import type { IGraphData } from '../../../../../shared/graph/contracts';
import type { CodeGraphyIndexFreshness } from '../../../../repoSettings/freshness';
import type {
  GraphViewIndexingProgress,
  GraphViewAnalysisExecutionState,
} from '../../execution';
import { getGraphIndexFreshness } from './freshness';
import {
  selectGraphViewRawDataLoadDecision,
  type GraphViewRawDataLoadDecision,
} from './routing';

export type GraphViewRawDataRoute = GraphViewRawDataLoadDecision['route'];
export type GraphViewAnalyzer = NonNullable<GraphViewAnalysisExecutionState['analyzer']>;

export interface GraphViewRawDataLoadContext {
  analyzer: GraphViewAnalyzer;
  forwardProgress: (progress: GraphViewIndexingProgress) => void;
  indexFreshness: CodeGraphyIndexFreshness | undefined;
  signal: AbortSignal;
  state: GraphViewAnalysisExecutionState;
}

export function hasReplayableGraphData(graphData: IGraphData): boolean {
  return graphData.nodes.length > 0 || graphData.edges.length > 0;
}

export function selectGraphViewRawDataLoadDecisionForState(
  state: GraphViewAnalysisExecutionState,
  analyzer: GraphViewAnalyzer,
): {
  decision: GraphViewRawDataLoadDecision;
  indexFreshness: CodeGraphyIndexFreshness | undefined;
} {
  if (state.mode === 'incremental') {
    return {
      decision: { route: 'incremental', shouldDiscover: false },
      indexFreshness: undefined,
    };
  }

  const indexFreshness = getGraphIndexFreshness(analyzer);
  return {
    decision: selectGraphViewRawDataLoadDecision(
      state.mode,
      indexFreshness,
      typeof analyzer.loadCachedGraph === 'function',
    ),
    indexFreshness,
  };
}
