import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../src/shared/graph/contracts';
vi.mock('../../../../src/webview/vscodeApi', () => ({ postMessage: vi.fn() }));

import { buildExportData } from '../../../../src/webview/export/json/export';
import type { IGroup } from '../../../../src/shared/settings/groups';

const noLegends: IGroup[] = [];

describe('buildExportData edges and images', () => {
  it('keeps edges without sources instead of synthesizing old connection buckets', () => {
    const data: IGraphData = {
      nodes: [
        { id: 'a.ts', label: 'a.ts', color: '#fff' },
        { id: 'b.ts', label: 'b.ts', color: '#fff' },
      ],
      edges: [{ id: 'e1', from: 'a.ts', to: 'b.ts' , kind: 'import', sources: [] }],
    };

    const result = buildExportData(data, noLegends);
    expect(result.edges).toEqual([
      {
        id: 'e1',
        from: 'a.ts',
        to: 'b.ts',
        kind: 'import',
        color: undefined,
        legendIds: [],
        sources: [],
      },
    ]);
  });


  it('adds legend ids to edges from edge-targeted legend rules', () => {
    const data: IGraphData = {
      nodes: [
        { id: 'src/App.tsx', label: 'App.tsx', color: '#fff' },
        { id: 'src/lib.ts', label: 'lib.ts', color: '#fff' },
      ],
      edges: [
        {
          id: 'src/App.tsx->src/lib.ts#import',
          from: 'src/App.tsx',
          to: 'src/lib.ts',
          kind: 'import',
          color: '#3178C6',
          sources: [],
        },
      ],
    };
    const legends: IGroup[] = [
      { id: 'edge-import', pattern: 'import', color: '#3178C6', target: 'edge' },
    ];

    const result = buildExportData(data, legends);
    expect(result.edges).toEqual([
      {
        id: 'src/App.tsx->src/lib.ts#import',
        from: 'src/App.tsx',
        to: 'src/lib.ts',
        kind: 'import',
        color: '#3178C6',
        legendIds: ['edge-import'],
        sources: [],
      },
    ]);
  });

  it('counts legend images from active legend rules', () => {
    const data: IGraphData = {
      nodes: [{ id: 'src/App.tsx', label: 'App.tsx', color: '#fff' }],
      edges: [],
    };
    const legends: IGroup[] = [
      { id: '1', pattern: '*.tsx', color: '#3B82F6', imagePath: '.codegraphy/images/app.png' },
    ];

    const result = buildExportData(data, legends);
    expect(result.summary.totalImages).toBe(1);
  });

});
