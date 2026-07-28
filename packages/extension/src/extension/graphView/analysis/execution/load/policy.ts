import type { GraphViewAnalysisExecutionState } from '../../execution';

export function shouldRefreshGraphIndex(
  mode: GraphViewAnalysisExecutionState['mode'],
): boolean {
  return mode === 'index'
    || mode === 'refresh';
}
