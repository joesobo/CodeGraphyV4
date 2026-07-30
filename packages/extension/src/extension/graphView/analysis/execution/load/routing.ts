import type { CodeGraphyIndexFreshness } from '../../../../repoSettings/freshness';
import type { GraphViewAnalysisExecutionState } from '../../execution';

export type GraphViewRawDataLoadRoute =
  | 'cached'
  | 'empty'
  | 'incremental'
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

  if (mode === 'incremental') {
    return { route: 'incremental' };
  }

  return { route: 'refresh' };
}
