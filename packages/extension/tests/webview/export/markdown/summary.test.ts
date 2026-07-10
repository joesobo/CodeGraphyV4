import { describe, expect, it } from 'vitest';
import { appendSection } from '../../../../src/webview/export/markdown/summary';
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

describe('webview/export/markdown/summary', () => {
  it('appends section headings with blank-line spacing', () => {
    const lines = ['# CodeGraphy Export'];

    appendSection(lines, '## Nodes');

    expect(lines).toEqual(['# CodeGraphy Export', '', '## Nodes', '']);
  });
});
