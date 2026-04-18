import type { ExportData } from '../shared/contracts';

function joinEdgeExtras(parts: Array<string | undefined>): string {
  const extras = parts.filter(Boolean);
  return extras.length > 0 ? ` | ${extras.join(' | ')}` : '';
}

function buildEdgeLine(edge: ExportData['edges'][number]): string {
  return `- \`${edge.kind}\` \`${edge.from}\` -> \`${edge.to}\`${joinEdgeExtras([
    edge.color ? `color: ${edge.color}` : undefined,
    edge.legendIds.length > 0 ? `legend: ${edge.legendIds.join(', ')}` : undefined,
  ])}`;
}

function appendEdgeSources(
  lines: string[],
  sources: ExportData['edges'][number]['sources'],
): void {
  if (sources.length === 0) {
    lines.push('  - sources: none');
    return;
  }

  for (const source of sources) {
    lines.push(`  - ${source.label} (${source.pluginName ?? source.pluginId})`);
  }
}

export function appendEdgeSourceLines(lines: string[], data: ExportData): void {
  if (data.edges.length === 0) {
    lines.push('- none');
    return;
  }

  for (const edge of data.edges) {
    lines.push(buildEdgeLine(edge));
    appendEdgeSources(lines, edge.sources);
  }
}
