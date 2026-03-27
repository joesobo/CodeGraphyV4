import { readFileSync } from 'fs';
import { type BaselineFileMetric } from './baselineMetric';

function isBaselineMetricWithPath(
  metric: BaselineFileMetric
): metric is BaselineFileMetric & { filePath: string } {
  return typeof metric.filePath === 'string';
}

export function readBaselineMetrics(baselinePath: string): BaselineFileMetric[] {
  return JSON.parse(readFileSync(baselinePath, 'utf-8')) as BaselineFileMetric[];
}

export function baselineMetricsByPath(
  baseline: BaselineFileMetric[]
): Map<string, BaselineFileMetric> {
  return new Map(
    baseline
      .filter(isBaselineMetricWithPath)
      .map((metric) => [metric.filePath, metric])
  );
}
