import { describe, expect, it } from 'vitest';
import { appendSection, appendTimelineSummary } from '../../../../src/webview/export/markdown/summary';
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

describe('webview/export/markdown/summary', () => {
  it('appends section headings with blank-line spacing', () => {
    const lines = ['# CodeGraphy Export'];

    appendSection(lines, '## Nodes');

    expect(lines).toEqual(['# CodeGraphy Export', '', '## Nodes', '']);
  });

  it('renders inactive and active timeline summaries', () => {
    const inactiveLines: string[] = [];
    const activeLines: string[] = [];
    const unknownCommitLines: string[] = [];

    appendTimelineSummary(inactiveLines, createExportData());
    appendTimelineSummary(
      activeLines,
      createExportData({
        scope: {
          graph: 'current-view',
          timeline: {
            active: true,
            commitSha: 'abc123',
          },
        },
      }),
    );
    appendTimelineSummary(
      unknownCommitLines,
      createExportData({
        scope: {
          graph: 'current-view',
          timeline: {
            active: true,
            commitSha: null,
          },
        },
      }),
    );

    expect(inactiveLines).toEqual(['> timeline: inactive']);
    expect(activeLines).toEqual(['> timeline commit: abc123']);
    expect(unknownCommitLines).toEqual(['> timeline commit: unknown']);
  });
});
