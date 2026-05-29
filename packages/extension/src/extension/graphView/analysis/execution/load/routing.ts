import type { CodeGraphyIndexFreshness } from '../../../../repoSettings/freshness';
import type { GraphViewAnalysisExecutionState } from '../../execution';
import { shouldDiscoverGraph, shouldRefreshGraphIndex } from './policy';

export type GraphViewRawDataLoadRoute = 'discover' | 'refresh' | 'incremental' | 'analyze';

export interface GraphViewRawDataLoadDecision {
  route: GraphViewRawDataLoadRoute;
  shouldDiscover: boolean;
}

export function selectGraphViewRawDataLoadDecision(
  mode: GraphViewAnalysisExecutionState['mode'],
  freshness: CodeGraphyIndexFreshness,
): GraphViewRawDataLoadDecision {
  const shouldDiscover = shouldDiscoverGraph(mode, freshness);
  if (shouldDiscover) {
    return { route: 'discover', shouldDiscover };
  }

  if (shouldRefreshGraphIndex(mode, freshness)) {
    return { route: 'refresh', shouldDiscover };
  }

  if (mode === 'incremental') {
    return { route: 'incremental', shouldDiscover };
  }

  return { route: 'analyze', shouldDiscover };
}
