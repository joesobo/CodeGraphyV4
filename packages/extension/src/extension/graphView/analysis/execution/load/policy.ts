import type { CodeGraphyIndexFreshness } from '../../../../repoSettings/freshness';
import type { GraphViewAnalysisExecutionState } from '../../execution';

export function shouldDiscoverGraph(
  mode: GraphViewAnalysisExecutionState['mode'],
  freshness: CodeGraphyIndexFreshness,
): boolean {
  return mode === 'load' && freshness === 'missing';
}

export function shouldRefreshGraphIndex(
  mode: GraphViewAnalysisExecutionState['mode'],
  freshness: CodeGraphyIndexFreshness,
): boolean {
  return mode === 'index'
    || mode === 'refresh'
    || (freshness === 'stale' && mode === 'load');
}
