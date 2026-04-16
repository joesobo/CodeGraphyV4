import type { ExportData } from '../shared/contracts';

function buildNodeLegendSuffix(legendIds: readonly string[]): string {
  return legendIds.length > 0 ? ` | legend: ${legendIds.join(', ')}` : '';
}

export function appendNodeLines(lines: string[], data: ExportData): void {
  if (data.nodes.length === 0) {
    lines.push('- none');
    return;
  }

  for (const node of data.nodes) {
    lines.push(`- \`${node.id}\` (${node.nodeType})${buildNodeLegendSuffix(node.legendIds)}`);
  }
}
