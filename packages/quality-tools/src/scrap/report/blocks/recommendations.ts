import { type ScrapFileMetric } from '../../analysis/metrics';

export function recommendationLines(metric: ScrapFileMetric): string[] {
  if ((metric.recommendations?.length ?? 0) === 0) {
    return [];
  }

  return [
    '  recommendations:',
    ...(metric.recommendations ?? []).map(
      (recommendation) =>
        `    - ${recommendation.kind} confidence=${recommendation.confidence} ${recommendation.message}`
    )
  ];
}
