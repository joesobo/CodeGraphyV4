import type { CodeGraphyIndexFreshness } from '../../../../repoSettings/freshness';
import type { GraphViewAnalysisExecutionState } from '../../execution';

export function resolveGraphIndexStatus(
  state: GraphViewAnalysisExecutionState | undefined,
  hasIndex: boolean,
): { freshness: CodeGraphyIndexFreshness; detail: string } {
  const status = state?.analyzer?.getIndexStatus?.();
  if (status) {
    return status;
  }

  return {
    freshness: hasIndex ? 'fresh' : 'missing',
    detail: hasIndex
      ? 'CodeGraphy index is fresh.'
      : 'CodeGraphy index is missing. Index the workspace to build the graph.',
  };
}

export function shouldReportGraphViewUpdateProgress(
  state: GraphViewAnalysisExecutionState,
): boolean {
  return state.mode === 'index' || state.mode === 'refresh' || state.mode === 'incremental';
}
