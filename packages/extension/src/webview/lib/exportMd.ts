import type { IGraphData, IGroup } from '../../shared/types';
import { buildExportData } from './exportData';

export function buildMarkdownExport(graphData: IGraphData, groups: IGroup[]): string {
  const data = buildExportData(graphData, groups);

  const lines: string[] = [
    '# CodeGraphy Export',
    '',
    `> ${data.stats.totalFiles} files, ${data.stats.totalConnections} connections`,
    '',
  ];

  // Groups section
  const groupEntries = Object.values(data.groups);
  if (groupEntries.length > 0) {
    lines.push('## Groups', '');
    for (const group of groupEntries) {
      const parts = [`\`${group.pattern}\``, group.color];
      if (group.shape2D) parts.push(group.shape2D);
      if (group.imagePath) parts.push(`image: ${group.imagePath}`);
      lines.push(`- ${parts.join(' | ')}`);
    }
    lines.push('');
  }

  // Files section
  lines.push('## Files', '');
  for (const [filePath, file] of Object.entries(data.files)) {
    const hasImports = file.imports.length > 0;
    const groupTag = file.group ? ` (\`${file.group}\`)` : '';

    if (hasImports) {
      lines.push(`- **${filePath}**${groupTag}`);
      for (const imp of file.imports) {
        lines.push(`  - ${imp}`);
      }
    } else {
      lines.push(`- ${filePath}${groupTag}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}
