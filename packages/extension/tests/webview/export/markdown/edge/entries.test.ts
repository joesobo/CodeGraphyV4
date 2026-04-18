import { describe, expect, it } from 'vitest';
import { appendEdgeSourceLines } from '../../../../../src/webview/export/markdown/edge/entries';
import type { ExportData } from '../../../../../src/webview/export/shared/contracts';

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

describe('webview/export/markdown/edge/entries', () => {
  it('renders the empty state and missing sources', () => {
    const emptyLines: string[] = [];
    const sourceLines: string[] = [];

    appendEdgeSourceLines(emptyLines, createExportData());
    appendEdgeSourceLines(
      sourceLines,
      createExportData({
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
      }),
    );

    expect(emptyLines).toEqual(['- none']);
    expect(sourceLines).toEqual([
      '- `import` `src/app.ts` -> `src/lib.ts` | color: #3178C6 | legend: edge-import',
      '  - sources: none',
    ]);
  });

  it('renders edge sources preferring plugin names over ids', () => {
    const lines: string[] = [];

    appendEdgeSourceLines(
      lines,
      createExportData({
        edges: [
          {
            id: 'e1',
            from: 'src/App.ts',
            to: 'README.md',
            kind: 'reference',
            legendIds: [],
            sources: [
              {
                id: 'ts:import',
                pluginId: 'ts',
                pluginName: 'TypeScript',
                sourceId: 'import',
                label: 'Import',
              },
              {
                id: 'custom:scan',
                pluginId: 'custom',
                sourceId: 'scan',
                label: 'Scan',
              },
            ],
          },
        ],
      }),
    );

    expect(lines).toEqual([
      '- `reference` `src/App.ts` -> `README.md`',
      '  - Import (TypeScript)',
      '  - Scan (custom)',
    ]);
  });
});
