import { type ScrapFileMetric } from './scrapTypes';
import { baselineMetricsByPath, readBaselineMetrics } from './baselineFiles';
import { comparisonForMetric } from './baselineMetric';

export function applyBaselineComparison(
  metrics: ScrapFileMetric[],
  baselinePath: string
): ScrapFileMetric[] {
  const previousByPath = baselineMetricsByPath(readBaselineMetrics(baselinePath));

  return metrics.map((metric) => ({
    ...metric,
    comparison: comparisonForMetric(metric, previousByPath.get(metric.filePath))
  }));
}
