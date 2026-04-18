import type { ExportData } from '../shared/contracts';

export function appendSection(lines: string[], title: string): void {
  lines.push('', title, '');
}

export function appendTimelineSummary(lines: string[], data: ExportData): void {
  lines.push(
    data.scope.timeline.active
      ? `> timeline commit: ${data.scope.timeline.commitSha ?? 'unknown'}`
      : '> timeline: inactive',
  );
}
