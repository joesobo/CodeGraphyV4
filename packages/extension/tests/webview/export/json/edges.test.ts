import { describe, expect, it } from 'vitest';
import type { IGraphData } from '../../../../src/shared/graph/types';
import type { IGroup } from '../../../../src/shared/settings/groups';
import { buildExportEdges } from '../../../../src/webview/export/json/edges';

describe('webview/export/json/edges', () => {
  it('sorts edges and nested sources by id while attaching plugin display names', () => {
    const graphData: IGraphData = {
      nodes: [],
      edges: [
        {
          id: 'b-edge',
          from: 'src/B.ts',
          to: 'src/C.ts',
          kind: 'reference',
          color: '#22C55E',
          sources: [
            {
              id: 'source-2',
              pluginId: 'plugin-b',
              sourceId: 'reference',
              label: 'Reference',
              variant: 'indirect',
              metadata: { strength: 2 },
            },
            {
              id: 'source-1',
              pluginId: 'plugin-a',
              sourceId: 'reference',
              label: 'Reference',
              variant: 'direct',
              metadata: { strength: 1 },
            },
          ],
        },
        {
          id: 'a-edge',
          from: 'src/A.ts',
          to: 'src/B.ts',
          kind: 'import',
          color: '#3178C6',
          sources: [
            {
              id: 'source-3',
              pluginId: 'plugin-missing',
              sourceId: 'import',
              label: 'Import',
            },
          ],
        },
      ],
    };

    const result = buildExportEdges(
      graphData,
      [],
      new Map([
        ['plugin-a', 'Plugin A'],
        ['plugin-b', 'Plugin B'],
      ]),
    );

    expect(result).toEqual([
      {
        id: 'a-edge',
        from: 'src/A.ts',
        to: 'src/B.ts',
        kind: 'import',
        color: '#3178C6',
        legendIds: [],
        sources: [
          {
            id: 'source-3',
            pluginId: 'plugin-missing',
            pluginName: undefined,
            sourceId: 'import',
            label: 'Import',
            variant: undefined,
            metadata: undefined,
          },
        ],
      },
      {
        id: 'b-edge',
        from: 'src/B.ts',
        to: 'src/C.ts',
        kind: 'reference',
        color: '#22C55E',
        legendIds: [],
        sources: [
          {
            id: 'source-1',
            pluginId: 'plugin-a',
            pluginName: 'Plugin A',
            sourceId: 'reference',
            label: 'Reference',
            variant: 'direct',
            metadata: { strength: 1 },
          },
          {
            id: 'source-2',
            pluginId: 'plugin-b',
            pluginName: 'Plugin B',
            sourceId: 'reference',
            label: 'Reference',
            variant: 'indirect',
            metadata: { strength: 2 },
          },
        ],
      },
    ]);
  });

  it('matches edge legends by kind, edge id, route path, and route path with kind suffix', () => {
    const graphData: IGraphData = {
      nodes: [],
      edges: [
        {
          id: 'src/App.ts->src/lib.ts#import',
          from: 'src/App.ts',
          to: 'src/lib.ts',
          kind: 'import',
          color: '#3178C6',
          sources: [],
        },
      ],
    };
    const legends: IGroup[] = [
      { id: 'node-only', pattern: '*.ts', color: '#fff', target: 'node' },
      { id: 'match-kind', pattern: 'import', color: '#3178C6', target: 'edge' },
      { id: 'match-id', pattern: 'src/App.ts->src/lib.ts#import', color: '#22C55E', target: 'edge' },
      { id: 'match-path', pattern: 'src/App.ts->src/lib.ts', color: '#F59E0B', target: 'edge' },
      { id: 'match-path-kind', pattern: '*#import', color: '#EF4444', target: 'edge' },
      { id: 'miss', pattern: 'reference', color: '#A855F7', target: 'edge' },
    ];

    const result = buildExportEdges(graphData, legends, new Map());

    expect(result).toEqual([
      {
        id: 'src/App.ts->src/lib.ts#import',
        from: 'src/App.ts',
        to: 'src/lib.ts',
        kind: 'import',
        color: '#3178C6',
        legendIds: ['match-kind', 'match-id', 'match-path', 'match-path-kind'],
        sources: [],
      },
    ]);
  });

  it('keeps unmatched edges without legend ids', () => {
    const graphData: IGraphData = {
      nodes: [],
      edges: [
        {
          id: 'src/App.ts->src/lib.ts#import',
          from: 'src/App.ts',
          to: 'src/lib.ts',
          kind: 'import',
          sources: [],
        },
      ],
    };
    const legends: IGroup[] = [
      { id: 'node-only', pattern: '*.ts', color: '#fff', target: 'node' },
      { id: 'miss', pattern: 'reference', color: '#A855F7', target: 'edge' },
    ];

    expect(buildExportEdges(graphData, legends, new Map())).toEqual([
      {
        id: 'src/App.ts->src/lib.ts#import',
        from: 'src/App.ts',
        to: 'src/lib.ts',
        kind: 'import',
        color: undefined,
        legendIds: [],
        sources: [],
      },
    ]);
  });
});
