import type { ExportData } from '../shared/contracts';

function appendSection(lines: string[], title: string): void {
  lines.push('', title, '');
}

function appendTimelineSummary(lines: string[], data: ExportData): void {
  lines.push(
    data.scope.timeline.active
      ? `> timeline commit: ${data.scope.timeline.commitSha ?? 'unknown'}`
      : '> timeline: inactive',
  );
}

function joinExtras(parts: Array<string | undefined>): string {
  const extras = parts.filter(Boolean);
  return extras.length > 0 ? ` | ${extras.join(' | ')}` : '';
}

function appendLegendLines(lines: string[], data: ExportData): void {
  if (data.legend.length === 0) {
    lines.push('- none');
    return;
  }

  for (const rule of data.legend) {
    lines.push(
      `- \`${rule.pattern}\` (${rule.color})${joinExtras([
        rule.shape2D,
        rule.shape3D,
        rule.imagePath ? `image: ${rule.imagePath}` : undefined,
        rule.pluginName ? `plugin: ${rule.pluginName}` : undefined,
      ])}`,
    );
  }
}

function appendNodeLines(lines: string[], data: ExportData): void {
  if (data.nodes.length === 0) {
    lines.push('- none');
    return;
  }

  for (const node of data.nodes) {
    lines.push(
      `- \`${node.id}\` (${node.nodeType})${node.legendIds.length > 0 ? ` | legend: ${node.legendIds.join(', ')}` : ''}`,
    );
  }
}

function appendEdgeSourceLines(lines: string[], data: ExportData): void {
  if (data.edges.length === 0) {
    lines.push('- none');
    return;
  }

  for (const edge of data.edges) {
    lines.push(
      `- \`${edge.kind}\` \`${edge.from}\` -> \`${edge.to}\`${joinExtras([
        edge.color ? `color: ${edge.color}` : undefined,
        edge.legendIds.length > 0 ? `legend: ${edge.legendIds.join(', ')}` : undefined,
      ])}`,
    );

    if (edge.sources.length === 0) {
      lines.push('  - sources: none');
      continue;
    }

    for (const source of edge.sources) {
      lines.push(`  - ${source.label} (${source.pluginName ?? source.pluginId})`);
    }
  }
}

export function renderMarkdownExport(data: ExportData): string {
  const lines: string[] = [
    '# CodeGraphy Export',
    '',
    `> ${data.summary.totalNodes} nodes, ${data.summary.totalEdges} edges`,
  ];

  appendTimelineSummary(lines, data);
  appendSection(lines, '## Legend');
  appendLegendLines(lines, data);
  appendSection(lines, '## Nodes');
  appendNodeLines(lines, data);
  appendSection(lines, '## Edges');
  appendEdgeSourceLines(lines, data);

  return `${lines.join('\n')}\n`;
}
