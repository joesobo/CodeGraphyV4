import { type OrganizeFileIssue } from '../types';
import { formatBarrelIssues, formatLowInfoIssues, formatRedundancyIssues } from './issueFormatters';

export function fileIssueLines(issues: OrganizeFileIssue[]): string[] {
  if (issues.length === 0) {
    return [];
  }

  const redundancyIssues = issues.filter((i) => i.kind === 'redundancy');
  const lowInfoIssues = issues.filter((i) => i.kind === 'low-info-banned' || i.kind === 'low-info-discouraged');
  const barrelIssues = issues.filter((i) => i.kind === 'barrel');

  const lines: string[] = [];

  const redundancyLine = formatRedundancyIssues(redundancyIssues);
  if (redundancyLine) {
    lines.push(redundancyLine);
  }

  const lowInfoLine = formatLowInfoIssues(lowInfoIssues);
  if (lowInfoLine) {
    lines.push(lowInfoLine);
  }

  const barrelLine = formatBarrelIssues(barrelIssues);
  if (barrelLine) {
    lines.push(barrelLine);
  }

  return lines;
}
