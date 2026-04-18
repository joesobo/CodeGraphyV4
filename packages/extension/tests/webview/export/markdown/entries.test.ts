import { describe, expect, it } from 'vitest';
import {
  appendEdgeSourceLines,
} from '../../../../src/webview/export/markdown/edge/entries';
import { appendLegendLines } from '../../../../src/webview/export/markdown/legendEntries';
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

describe('webview/export/markdown/entries', () => {
  it('renders legend and node empty states', () => {
    const legendLines: string[] = [];
    const nodeLines: string[] = [];

    appendLegendLines(legendLines, createExportData());
    appendNodeLines(nodeLines, createExportData());

    expect(legendLines).toEqual(['- none']);
    expect(nodeLines).toEqual(['- none']);
  });

  it('renders legend, node, and edge metadata inline', () => {
    const legendLines: string[] = [];
    const nodeLines: string[] = [];
    const edgeLines: string[] = [];
    const data = createExportData({
      legend: [
        {
          id: 'g1',
          pattern: 'src/**',
          color: '#3B82F6',
          target: 'node',
          shape2D: 'diamond',
          pluginName: 'TypeScript',
        },
      ],
      nodes: [
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
          color: '#3178C6',
          legendIds: ['g1'],
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
    });

    appendLegendLines(legendLines, data);
    appendNodeLines(nodeLines, data);
    appendEdgeSourceLines(edgeLines, data);

    expect(legendLines).toEqual(['- `src/**` (#3B82F6) | diamond | plugin: TypeScript']);
    expect(nodeLines).toEqual(['- `src/App.ts` (file) | legend: g1']);
    expect(edgeLines).toEqual([
      '- `reference` `src/App.ts` -> `README.md` | color: #3178C6 | legend: g1',
      '  - Import (TypeScript)',
    ]);
  });
});
