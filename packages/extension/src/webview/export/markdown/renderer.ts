import { renderMarkdownGroupsSection, renderMarkdownUngroupedSection } from './groups';
import { renderMarkdownImagesSection } from './images';
import { renderMarkdownRulesSection } from './rules';
import type { ExportData } from '../shared/contracts';

export function renderMarkdownExport(data: ExportData): string {
  const lines: string[] = [
    '# CodeGraphy Export',
    '',
    `> ${data.summary.totalFiles} files, ${data.summary.totalConnections} connections`,
  ];

  if (data.scope.timeline.active) {
    lines.push(`> timeline commit: ${data.scope.timeline.commitSha ?? 'unknown'}`);
  } else {
    lines.push('> timeline: inactive');
  }

  lines.push('', '## Connections', '');

  lines.push(...renderMarkdownRulesSection(data.sections.connections.rules));
  lines.push('### Groups', '');
  lines.push(
    ...renderMarkdownGroupsSection(data.sections.connections.groups, data.sections.connections.rules),
  );
  lines.push(
    ...renderMarkdownUngroupedSection(data.sections.connections.ungrouped, data.sections.connections.rules),
  );

  lines.push('## Images', '');
  lines.push(...renderMarkdownImagesSection(data.sections.images));

  return lines.join('\n');
}
