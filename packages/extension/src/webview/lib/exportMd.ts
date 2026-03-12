import type { IGraphData, IGroup, IPluginStatus } from '../../shared/types';
import { buildExportData, ExportFile, ExportData } from './exportData';

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
  const ruleEntries = Object.entries(data.rules);
  if (ruleEntries.length > 0) {
    lines.push('## Rules', '');
    for (const [id, rule] of ruleEntries) {
      lines.push(`- **${rule.name}** (\`${id}\`, ${rule.plugin}) — ${rule.connections} connections`);
    }
    lines.push('');
  }

  // Groups with nested files
  for (const [pattern, group] of Object.entries(data.groups)) {
    const parts = [`\`${pattern}\``, group.color];
    if (group.shape2D) parts.push(group.shape2D);
    if (group.imagePath) parts.push(`image: ${group.imagePath}`);
    lines.push(`## ${parts.join(' | ')}`, '');
    renderFiles(lines, group.files, data);
    lines.push('');
  }

  // Ungrouped files
  const ungroupedEntries = Object.entries(data.ungrouped);
  if (ungroupedEntries.length > 0) {
    lines.push('## Ungrouped', '');
    renderFiles(lines, data.ungrouped, data);
    lines.push('');
  }

  return lines.join('\n');
}

function renderFiles(lines: string[], files: Record<string, ExportFile>, data: ExportData) {
  for (const [filePath, file] of Object.entries(files)) {
    if (file.imports.length > 0) {
      lines.push(`- **${filePath}**`);
      for (const imp of file.imports) {
        const ruleTag = imp.rules?.length
          ? ` (${imp.rules.map(r => data.rules[r]?.name ?? r).join(', ')})`
          : '';
        lines.push(`  - ${imp.file}${ruleTag}`);
      }
    } else {
      lines.push(`- ${filePath}`);
    }
  }
}
