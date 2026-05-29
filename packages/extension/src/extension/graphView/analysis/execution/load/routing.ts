import type { CodeGraphyIndexFreshness } from '../../../../repoSettings/freshness';
import type { GraphViewAnalysisExecutionState } from '../../execution';
import { shouldDiscoverGraph, shouldRefreshGraphIndex } from './policy';

export type GraphViewRawDataLoadRoute = 'discover' | 'cached' | 'refresh' | 'incremental' | 'analyze';

export interface GraphViewRawDataLoadDecision {
  route: GraphViewRawDataLoadRoute;
  shouldDiscover: boolean;
}

export function selectGraphViewRawDataLoadDecision(
  mode: GraphViewAnalysisExecutionState['mode'],
  freshness: CodeGraphyIndexFreshness,
  canLoadCachedGraph = false,
): GraphViewRawDataLoadDecision {
  const shouldDiscover = shouldDiscoverGraph(mode, freshness);
  if (shouldDiscover) {
    return { route: 'discover', shouldDiscover };
  }

  if (mode === 'load' && freshness === 'stale' && canLoadCachedGraph) {
    return { route: 'cached', shouldDiscover };
  }

  if (shouldRefreshGraphIndex(mode, freshness)) {
    return { route: 'refresh', shouldDiscover };
  }

  if (mode === 'incremental') {
    return { route: 'incremental', shouldDiscover };
  }

  return { route: 'analyze', shouldDiscover };
}
