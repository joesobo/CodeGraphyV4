import { describe, expect, it } from 'vitest';
import { renderMarkdownExport } from '../../../../src/webview/export/markdown/renderer';
import type { ExportData } from '../../../../src/webview/export/shared/contracts';

function createExportData(overrides: Partial<ExportData> = {}): ExportData {
  return {
    format: 'codegraphy-export',
    version: '3.0',
    exportedAt: '2026-03-16T12:34:56.000Z',
    scope: {
      graph: 'current-view',
    },
    summary: {
      totalNodes: 0,
      totalEdges: 0,
      totalLegendRules: 0,
      totalImages: 0,
    },
    legend: [],
    nodes: [],
    edges: [],
    ...overrides,
  };
}

describe('renderMarkdownExport', () => {

  it('renders edge legend ids and colors when edge metadata is present', () => {
    const markdown = renderMarkdownExport(createExportData({
      summary: {
        totalNodes: 2,
        totalEdges: 1,
        totalLegendRules: 1,
        totalImages: 0,
      },
      legend: [
        {
          id: 'edge-import',
          pattern: 'import',
          color: '#3178C6',
          target: 'edge',
        },
      ],
      nodes: [
        {
          id: 'src/app.ts',
          label: 'app.ts',
          nodeType: 'file',
          color: '#fff',
          legendIds: [],
        },
        {
          id: 'src/lib.ts',
          label: 'lib.ts',
          nodeType: 'file',
          color: '#fff',
          legendIds: [],
        },
      ],
      edges: [
        {
          id: 'edge-1',
          from: 'src/app.ts',
          to: 'src/lib.ts',
          kind: 'import',
          color: '#3178C6',
          legendIds: ['edge-import'],
          sources: [],
        },
      ],
    }));

    expect(markdown).toContain('- `import` `src/app.ts` -> `src/lib.ts` | color: #3178C6 | legend: edge-import');
    expect(markdown).toContain('  - sources: none');
  });
});
