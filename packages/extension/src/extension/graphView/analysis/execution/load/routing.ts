import type { CodeGraphyIndexFreshness } from '../../../../repoSettings/freshness';
import type { GraphViewAnalysisExecutionState } from '../../execution';

export type GraphViewRawDataLoadRoute =
  | 'cached'
  | 'empty'
  | 'refresh';

export interface GraphViewRawDataLoadDecision {
  route: GraphViewRawDataLoadRoute;
}

export function selectGraphViewRawDataLoadDecision(
  mode: GraphViewAnalysisExecutionState['mode'],
  freshness: CodeGraphyIndexFreshness,
  canLoadCachedGraph = false,
): GraphViewRawDataLoadDecision {
  if (mode === 'load') {
    return {
      route: freshness !== 'missing' && canLoadCachedGraph ? 'cached' : 'empty',
    };
  }

  return { route: 'refresh' };
}
