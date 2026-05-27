import type { CodeGraphyIndexFreshness } from '../../../../repoSettings/freshness';
import type { GraphViewAnalysisExecutionState } from '../../execution';

type GraphViewAnalyzer = NonNullable<GraphViewAnalysisExecutionState['analyzer']>;

export function getGraphIndexFreshness(analyzer: GraphViewAnalyzer): CodeGraphyIndexFreshness {
  const status = analyzer.getIndexStatus?.();
  if (status) {
    return status.freshness;
  }

  return analyzer.hasIndex() ? 'fresh' : 'missing';
}
