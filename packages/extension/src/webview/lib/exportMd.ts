import type { IGraphData, IGroup, IPluginStatus } from '../../shared/types';
import { buildExportData, ExportFile } from './exportData';

export function buildMarkdownExport(
  graphData: IGraphData,
  groups: IGroup[],
  pluginStatuses: IPluginStatus[] = [],
): string {
  const data = buildExportData(graphData, groups, pluginStatuses);

  const lines: string[] = [
    '# CodeGraphy Export',
    '',
    `> ${data.stats.totalFiles} files, ${data.stats.totalConnections} connections`,
    '',
  ];

  // Rules section
  if (data.rules.length > 0) {
    lines.push('## Rules', '');
    for (const rule of data.rules) {
      lines.push(`- **${rule.name}** (${rule.plugin}) — ${rule.connections} connections`);
    }
    lines.push('');
  }

  // Groups with nested files
  const groupEntries = Object.entries(data.groups);
  if (groupEntries.length > 0) {
    for (const [pattern, group] of groupEntries) {
      const parts = [`\`${pattern}\``, group.color];
      if (group.shape2D) parts.push(group.shape2D);
      if (group.imagePath) parts.push(`image: ${group.imagePath}`);
      lines.push(`## ${parts.join(' | ')}`, '');
      renderFiles(lines, group.files);
      lines.push('');
    }
  }

  // Ungrouped files
  const ungroupedEntries = Object.entries(data.ungrouped);
  if (ungroupedEntries.length > 0) {
    lines.push('## Ungrouped', '');
    renderFiles(lines, data.ungrouped);
    lines.push('');
  }

  return lines.join('\n');
}

function renderFiles(lines: string[], files: Record<string, ExportFile>) {
  for (const [filePath, file] of Object.entries(files)) {
    if (file.imports.length > 0) {
      lines.push(`- **${filePath}**`);
      for (const imp of file.imports) {
        lines.push(`  - ${imp}`);
      }
    } else {
      lines.push(`- ${filePath}`);
    }
  }
}
