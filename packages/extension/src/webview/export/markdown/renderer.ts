import type { ExportData } from '../shared/contracts';
import {
  appendEdgeSourceLines,
  appendLegendLines,
  appendNodeLines,
  appendSection,
  appendTimelineSummary,
} from './sections';

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
