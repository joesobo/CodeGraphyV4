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
    if (!file.imports) {
      lines.push(`- ${filePath}`);
      continue;
    }

    const ruleKeys = Object.keys(file.imports);
    lines.push(`- **${filePath}**`);

    // If all imports are unattributed (empty-string key only), list them flat
    if (ruleKeys.length === 1 && ruleKeys[0] === '') {
      for (const target of file.imports['']) {
        lines.push(`  - ${target}`);
      }
      continue;
    }

    // Group imports by rule
    for (const [ruleKey, targets] of Object.entries(file.imports)) {
      if (targets.length === 0) continue;
      const label = ruleKey ? (data.rules[ruleKey]?.name ?? ruleKey) : 'other';
      lines.push(`  - *${label}*`);
      for (const target of targets) {
        lines.push(`    - ${target}`);
      }
    }
  }
}
