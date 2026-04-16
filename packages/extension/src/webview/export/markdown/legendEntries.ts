import type { ExportData } from '../shared/contracts';

function joinLegendExtras(parts: Array<string | undefined>): string {
  const extras = parts.filter(Boolean);
  return extras.length > 0 ? ` | ${extras.join(' | ')}` : '';
}

export function appendLegendLines(lines: string[], data: ExportData): void {
  if (data.legend.length === 0) {
    lines.push('- none');
    return;
  }

  for (const rule of data.legend) {
    lines.push(
      `- \`${rule.pattern}\` (${rule.color})${joinLegendExtras([
        rule.shape2D,
        rule.shape3D,
        rule.imagePath ? `image: ${rule.imagePath}` : undefined,
        rule.pluginName ? `plugin: ${rule.pluginName}` : undefined,
      ])}`,
    );
  }
}
