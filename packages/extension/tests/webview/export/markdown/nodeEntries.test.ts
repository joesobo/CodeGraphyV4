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

  it('renders symbol nodes with their containing file and kind', () => {
    const lines: string[] = [];

    appendNodeLines(
      lines,
      createExportData({
        nodes: [
          {
            id: 'src/App.ts#render:function',
            label: 'render',
            nodeType: 'symbol',
            color: '#8B5CF6',
            legendIds: [],
            symbol: {
              id: 'src/App.ts#render:function',
              name: 'render',
              kind: 'function',
              filePath: 'src/App.ts',
            },
          },
        ],
      }),
    );

    expect(lines).toEqual([
      '- `src/App.ts#render:function` (symbol: function `render` in `src/App.ts`)',
    ]);
  });
});
