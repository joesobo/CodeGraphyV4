import { type ScrapFileMetric } from './metrics';

export function comparisonLines(metric: ScrapFileMetric): string[] {
  if (!metric.comparison) {
    return [];
  }

  return [
    `  compare: ${metric.comparison.verdict} avgΔ=${metric.comparison.averageScoreDelta} maxΔ=${metric.comparison.maxScoreDelta} extractΔ=${metric.comparison.extractionPressureDelta}`
  ];
}
