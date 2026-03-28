import { readFileSync } from 'fs';
import { type OrganizeDirectoryMetric, type OrganizeComparison } from './types';
import { verdictFromDeltas } from './verdict';

function roundedDelta(current: number, previous: number): number {
  return Math.round((current - previous) * 100) / 100;
}

function baselineMetricsByPath(
  baseline: OrganizeDirectoryMetric[]
): Map<string, OrganizeDirectoryMetric> {
  return new Map(
    baseline
      .filter((metric) => typeof metric.directoryPath === 'string')
      .map((metric) => [metric.directoryPath, metric])
  );
}

export function compareBaseline(
  current: OrganizeDirectoryMetric[],
  baselinePath: string
): Map<string, OrganizeComparison> {
  const baselineData = JSON.parse(readFileSync(baselinePath, 'utf-8')) as OrganizeDirectoryMetric[];
  const previousByPath = baselineMetricsByPath(baselineData);
  const comparisons = new Map<string, OrganizeComparison>();

  for (const metric of current) {
    const previous = previousByPath.get(metric.directoryPath);
    if (!previous) {
      continue;
    }

    const fileFanOutDelta = metric.fileFanOut - previous.fileFanOut;
    const folderFanOutDelta = metric.folderFanOut - previous.folderFanOut;
    const clusterCountDelta = metric.clusters.length - previous.clusters.length;
    const issueCountDelta = metric.fileIssues.length - previous.fileIssues.length;
    const redundancyDelta = roundedDelta(metric.averageRedundancy, previous.averageRedundancy);

    const comparison: OrganizeComparison = {
      fileFanOutDelta,
      folderFanOutDelta,
      clusterCountDelta,
      issueCountDelta,
      redundancyDelta,
      verdict: verdictFromDeltas(fileFanOutDelta, folderFanOutDelta, clusterCountDelta, issueCountDelta, redundancyDelta)
    };

    comparisons.set(metric.directoryPath, comparison);
  }

  return comparisons;
}
