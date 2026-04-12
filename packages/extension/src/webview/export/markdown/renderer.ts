import type { ExportData } from '../shared/contracts';

export function renderMarkdownExport(data: ExportData): string {
  const lines: string[] = [
    '# CodeGraphy Export',
    '',
    `> ${data.summary.totalNodes} nodes, ${data.summary.totalEdges} edges`,
  ];

  if (data.scope.timeline.active) {
    lines.push(`> timeline commit: ${data.scope.timeline.commitSha ?? 'unknown'}`);
  } else {
    lines.push('> timeline: inactive');
  }

  lines.push('', '## Legend', '');
  if (data.legend.length === 0) {
    lines.push('- none');
  } else {
    for (const rule of data.legend) {
      const extras = [
        rule.shape2D,
        rule.shape3D,
        rule.imagePath ? `image: ${rule.imagePath}` : undefined,
        rule.pluginName ? `plugin: ${rule.pluginName}` : undefined,
      ].filter(Boolean);
      lines.push(`- \`${rule.pattern}\` (${rule.color})${extras.length > 0 ? ` | ${extras.join(' | ')}` : ''}`);
    }
  }

  lines.push('', '## Nodes', '');
  if (data.nodes.length === 0) {
    lines.push('- none');
  } else {
    for (const node of data.nodes) {
      const legendSuffix = node.legendIds.length > 0
        ? ` | legend: ${node.legendIds.join(', ')}`
        : '';
      lines.push(`- \`${node.id}\` (${node.nodeType})${legendSuffix}`);
    }
  }

  lines.push('', '## Edges', '');
  if (data.edges.length === 0) {
    lines.push('- none');
  } else {
    for (const edge of data.edges) {
      const edgeSuffix = [
        edge.color ? `color: ${edge.color}` : undefined,
        edge.legendIds.length > 0 ? `legend: ${edge.legendIds.join(', ')}` : undefined,
      ].filter(Boolean);

      lines.push(
        `- \`${edge.kind}\` \`${edge.from}\` -> \`${edge.to}\`${edgeSuffix.length > 0 ? ` | ${edgeSuffix.join(' | ')}` : ''}`,
      );
      if (edge.sources.length === 0) {
        lines.push('  - sources: none');
        continue;
      }

      for (const source of edge.sources) {
        const pluginLabel = source.pluginName ?? source.pluginId;
        lines.push(`  - ${source.label} (${pluginLabel})`);
      }
    }
  }

  return `${lines.join('\n')}\n`;
}
