import { clusterLines } from './reportClusters';
import { fileIssueLines } from './reportFileIssues';
import { summaryLines } from './reportSummary';
import type { OrganizeDirectoryMetric } from './organizeTypes';

export interface OrganizeReportOptions {
  verbose?: boolean;
}

function logLines(lines: string[]): void {
  for (const line of lines) {
    console.log(line);
  }
}

function shouldShowDirectory(metric: OrganizeDirectoryMetric, verbose: boolean): boolean {
  if (verbose) {
    return true;
  }

  // Show if there are any clusters or file issues
  if (metric.clusters.length > 0 || metric.fileIssues.length > 0) {
    return true;
  }

  // Show if any verdict is not STABLE
  const allVerdictStable =
    metric.fileFanOutVerdict === 'STABLE' &&
    metric.folderFanOutVerdict === 'STABLE' &&
    metric.depthVerdict === 'STABLE';

  return !allVerdictStable;
}

export function reportOrganize(
  metrics: OrganizeDirectoryMetric[],
  options: OrganizeReportOptions = {}
): void {
  if (metrics.length === 0) {
    console.log('No directories found for organize analysis.');
    return;
  }

  const metricsToShow = metrics.filter((metric) => shouldShowDirectory(metric, options.verbose ?? false));

  if (metricsToShow.length === 0) {
    console.log('No directories found for organize analysis.');
    return;
  }

  for (const metric of metricsToShow) {
    logLines(summaryLines(metric));
    logLines(clusterLines(metric.clusters, metric.directoryPath));
    logLines(fileIssueLines(metric.fileIssues));
    console.log('');
  }
}
