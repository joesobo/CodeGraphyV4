import { type OrganizeDirectoryMetric } from '../types';

function worstVerdict(metric: OrganizeDirectoryMetric): string {
  const verdicts: string[] = [];

  // Add depth verdict (DEEP counts as SPLIT level)
  if (metric.depthVerdict === 'DEEP') {
    verdicts.push('SPLIT');
  } else {
    verdicts.push(metric.depthVerdict);
  }

  verdicts.push(metric.fileFanOutVerdict);
  verdicts.push(metric.folderFanOutVerdict);

  // SPLIT > WARNING > STABLE
  if (verdicts.includes('SPLIT')) {
    return 'SPLIT';
  }
  if (verdicts.includes('WARNING')) {
    return 'WARNING';
  }
  return 'STABLE';
}

function countIssuesByKind(metric: OrganizeDirectoryMetric, kindPrefix: string): number {
  return metric.fileIssues.filter((issue) => issue.kind.startsWith(kindPrefix)).length;
}

export function summaryLines(metric: OrganizeDirectoryMetric): string[] {
  const verdict = worstVerdict(metric);
  const redundantCount = countIssuesByKind(metric, 'redundancy');
  const lowInfoCount = countIssuesByKind(metric, 'low-info');
  const barrelCount = countIssuesByKind(metric, 'barrel');
  const redundancy = metric.averageRedundancy.toFixed(2);

  const line =
    `${metric.directoryPath}  [${verdict}]  files: ${metric.fileFanOut}  folders: ${metric.folderFanOut}  depth: ${metric.depth}  redundancy: ${redundancy}  clusters: ${metric.clusters.length}  redundant: ${redundantCount}  low-info: ${lowInfoCount}  barrels: ${barrelCount}`;

  return [line];
}
