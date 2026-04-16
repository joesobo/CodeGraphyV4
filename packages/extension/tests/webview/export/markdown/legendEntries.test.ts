import { describe, expect, it } from 'vitest';
import { appendLegendLines } from '../../../../src/webview/export/markdown/legendEntries';
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

describe('webview/export/markdown/legendEntries', () => {
  it('renders the empty state', () => {
    const lines: string[] = [];

    appendLegendLines(lines, createExportData());

    expect(lines).toEqual(['- none']);
  });

  it('renders legend metadata only when present', () => {
    const lines: string[] = [];

    appendLegendLines(
      lines,
      createExportData({
        legend: [
          {
            id: 'g1',
            pattern: 'src/**',
            color: '#3B82F6',
            target: 'node',
            shape2D: 'diamond',
            shape3D: 'tetrahedron',
            imagePath: '.codegraphy/images/src.png',
            pluginName: 'TypeScript',
          },
          {
            id: 'g2',
            pattern: 'README*',
            color: '#F59E0B',
            target: 'node',
          },
        ],
      }),
    );

    expect(lines).toEqual([
      '- `src/**` (#3B82F6) | diamond | tetrahedron | image: .codegraphy/images/src.png | plugin: TypeScript',
      '- `README*` (#F59E0B)',
    ]);
  });
});
