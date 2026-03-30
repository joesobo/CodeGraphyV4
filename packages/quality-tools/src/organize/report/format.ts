import { clusterLines } from './clusters';
import { fileIssueLines } from './fileIssues';
import { summaryLines } from './summary';
import type { OrganizeDirectoryMetric } from '../types';

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

  // Show if there are any concrete file issues
  if (metric.fileIssues.length > 0) {
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
