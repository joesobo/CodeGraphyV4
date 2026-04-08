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
    sections: {
      legend: [],
      nodes: [],
      edges: [],
    },
    ...overrides,
  };
}

describe('renderMarkdownExport', () => {
  it('renders empty-state sections for inactive timeline exports', () => {
    const markdown = renderMarkdownExport(createExportData());

    expect(markdown).toBe([
      '# CodeGraphy Export',
      '',
      '> 0 nodes, 0 edges',
      '> timeline: inactive',
      '',
      '## Legend',
      '',
      '- none',
      '',
      '## Nodes',
      '',
      '- none',
      '',
      '## Edges',
      '',
      '- none',
      '',
    ].join('\n'));
  });

  it('renders legend entries, nodes, and sourced edges', () => {
    const markdown = renderMarkdownExport(createExportData({
      scope: {
        graph: 'current-view',
        timeline: {
          active: true,
          commitSha: 'abc123',
        },
      },
      summary: {
        totalNodes: 2,
        totalEdges: 1,
        totalLegendRules: 1,
        totalImages: 1,
      },
      sections: {
        legend: [
          {
            id: 'g1',
            pattern: 'src/**',
            color: '#3B82F6',
            target: 'node',
            shape2D: 'diamond',
            imagePath: '.codegraphy/images/src.png',
          },
        ],
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
            legendIds: ['g1'],
          },
        ],
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
            ],
          },
        ],
      },
    }));

    expect(markdown).toBe([
      '# CodeGraphy Export',
      '',
      '> 2 nodes, 1 edges',
      '> timeline commit: abc123',
      '',
      '## Legend',
      '',
      '- `src/**` (#3B82F6) | diamond | image: .codegraphy/images/src.png',
      '',
      '## Nodes',
      '',
      '- `README.md` (file)',
      '- `src/App.ts` (file) | legend: g1',
      '',
      '## Edges',
      '',
      '- `reference` `src/App.ts` -> `README.md`',
      '  - Import (TypeScript)',
      '',
    ].join('\n'));
  });
});
