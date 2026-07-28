import type { CodeGraphyIndexFreshness } from '../../../../repoSettings/freshness';
import type { GraphViewAnalysisExecutionState } from '../../execution';
import { shouldRefreshGraphIndex } from './policy';

export type GraphViewRawDataLoadRoute =
  | 'analyze'
  | 'cached'
  | 'empty'
  | 'incremental'
  | 'refresh';

export interface GraphViewRawDataLoadDecision {
  route: GraphViewRawDataLoadRoute;
  shouldDiscover: boolean;
}

export function selectGraphViewRawDataLoadDecision(
  mode: GraphViewAnalysisExecutionState['mode'],
  freshness: CodeGraphyIndexFreshness,
  canLoadCachedGraph = false,
): GraphViewRawDataLoadDecision {
  if (mode === 'load') {
    return {
      route: freshness !== 'missing' && canLoadCachedGraph ? 'cached' : 'empty',
      shouldDiscover: false,
    };
  }

  if (shouldRefreshGraphIndex(mode, freshness)) {
    return { route: 'refresh', shouldDiscover: false };
  }

  if (mode === 'incremental') {
    return { route: 'incremental', shouldDiscover: false };
  }

  return { route: 'analyze', shouldDiscover: false };
}
