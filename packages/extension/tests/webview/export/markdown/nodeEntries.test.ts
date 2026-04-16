import { describe, expect, it } from 'vitest';
import { appendNodeLines } from '../../../../src/webview/export/markdown/nodeEntries';
import type { ExportData } from '../../../../src/webview/export/shared/contracts';

function createExportData(overrides: Partial<ExportData> = {}): ExportData {
  return {
    format: 'codegraphy-export',
    version: '3.0',
    exportedAt: '2026-03-16T12:34:56.000Z',
    scope: {
      graph: 'current-view',
      timeline: {
        active: false,
        commitSha: null,
      },
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

describe('webview/export/markdown/nodeEntries', () => {
  it('renders the empty state', () => {
    const lines: string[] = [];

    appendNodeLines(lines, createExportData());

    expect(lines).toEqual(['- none']);
  });

  it('renders nodes with and without legend ids', () => {
    const lines: string[] = [];

    appendNodeLines(
      lines,
      createExportData({
        nodes: [
          {
            id: 'README.md',
            label: 'README.md',
            nodeType: 'file',
            color: '#fff',
            legendIds: [],
          },
          {
            id: 'src/App.ts',
            label: 'App.ts',
            nodeType: 'file',
            color: '#fff',
            legendIds: ['g1', 'g2'],
          },
        ],
      }),
    );

    expect(lines).toEqual([
      '- `README.md` (file)',
      '- `src/App.ts` (file) | legend: g1, g2',
    ]);
  });
});
