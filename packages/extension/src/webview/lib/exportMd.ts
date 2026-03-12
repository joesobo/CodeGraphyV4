import type { IGraphData } from '../../shared/types';

export function buildMarkdownExport(graphData: IGraphData): string {
  const importsMap = new Map<string, string[]>();
  for (const edge of graphData.edges) {
    const list = importsMap.get(edge.from);
    if (list) {
      list.push(edge.to);
    } else {
      importsMap.set(edge.from, [edge.to]);
    }
  }

  const lines: string[] = [
    '# CodeGraphy Export',
    '',
    `> ${graphData.nodes.length} files, ${graphData.edges.length} connections`,
    '',
  ];

  const sorted = [...graphData.nodes].sort((a, b) => a.id.localeCompare(b.id));

  for (const node of sorted) {
    const imports = importsMap.get(node.id);
    if (imports && imports.length > 0) {
      lines.push(`- **${node.id}**`);
      for (const imp of imports) {
        lines.push(`  - ${imp}`);
      }
    } else {
      lines.push(`- ${node.id}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}
