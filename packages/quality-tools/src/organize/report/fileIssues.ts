import { type OrganizeFileIssue } from '../organizeTypes';

export function fileIssueLines(issues: OrganizeFileIssue[]): string[] {
  if (issues.length === 0) {
    return [];
  }

  const redundancyIssues = issues.filter((i) => i.kind === 'redundancy');
  const lowInfoIssues = issues.filter((i) => i.kind === 'low-info-banned' || i.kind === 'low-info-discouraged');
  const barrelIssues = issues.filter((i) => i.kind === 'barrel');

  const lines: string[] = [];

  if (redundancyIssues.length > 0) {
    const itemsList = redundancyIssues
      .map((issue) => `${issue.fileName} (${issue.redundancyScore?.toFixed(2)})`)
      .join(', ');
    // "  Redundant: " = 12 chars + 1 space
    lines.push(`  Redundant: ${itemsList}`);
  }

  if (lowInfoIssues.length > 0) {
    const itemsList = lowInfoIssues
      .map((issue) => {
        const prefix = issue.kind === 'low-info-banned' ? 'banned' : 'discouraged';
        return `${issue.fileName} (${prefix}: ${issue.detail})`;
      })
      .join(', ');
    // "  Low-info:" = 11 chars + 2 spaces
    lines.push(`  Low-info:  ${itemsList}`);
  }

  if (barrelIssues.length > 0) {
    const itemsList = barrelIssues
      .map((issue) => `${issue.fileName} (${issue.detail})`)
      .join(', ');
    // "  Barrels:" = 10 chars + 3 spaces
    lines.push(`  Barrels:   ${itemsList}`);
  }

  return lines;
}
