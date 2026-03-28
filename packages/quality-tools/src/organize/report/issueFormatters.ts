import { type OrganizeFileIssue } from '../types';

export function formatRedundancyIssues(issues: OrganizeFileIssue[]): string | undefined {
  if (issues.length === 0) {
    return undefined;
  }

  const itemsList = issues
    .map((issue) => `${issue.fileName} (${issue.redundancyScore?.toFixed(2)})`)
    .join(', ');
  // "  Redundant: " = 12 chars + 1 space
  return `  Redundant: ${itemsList}`;
}

export function formatLowInfoIssues(issues: OrganizeFileIssue[]): string | undefined {
  if (issues.length === 0) {
    return undefined;
  }

  const itemsList = issues
    .map((issue) => {
      const prefix = issue.kind === 'low-info-banned' ? 'banned' : 'discouraged';
      return `${issue.fileName} (${prefix}: ${issue.detail})`;
    })
    .join(', ');
  // "  Low-info:" = 11 chars + 2 spaces
  return `  Low-info:  ${itemsList}`;
}

export function formatBarrelIssues(issues: OrganizeFileIssue[]): string | undefined {
  if (issues.length === 0) {
    return undefined;
  }

  const itemsList = issues
    .map((issue) => `${issue.fileName} (${issue.detail})`)
    .join(', ');
  // "  Barrels:" = 10 chars + 3 spaces
  return `  Barrels:   ${itemsList}`;
}
