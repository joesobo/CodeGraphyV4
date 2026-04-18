import { describe, expect, it } from 'vitest';
import type { IGraphData } from '../../../../src/shared/graph/contracts';
import type { IPluginStatus } from '../../../../src/shared/plugins/status';
import type { IGroup } from '../../../../src/shared/settings/groups';
import { buildExportData } from '../../../../src/webview/export/json/build';

describe('webview/export/json/build', () => {
  it('builds export data from active legends and plugin display names', () => {
    const data: IGraphData = {
      nodes: [
        { id: 'src/App.ts', label: 'App.ts', color: '#FFFFFF' },
        { id: 'src/lib.ts', label: 'lib.ts', color: '#FFFFFF' },
      ],
      edges: [
        {
          id: 'src/App.ts->src/lib.ts#import',
          from: 'src/App.ts',
          to: 'src/lib.ts',
          kind: 'import',
          sources: [
            {
              id: 'typescript:import',
              pluginId: 'typescript',
              sourceId: 'import',
              label: 'Import',
            },
          ],
        },
      ],
    };
    const legends: IGroup[] = [
      { id: 'active-node', pattern: '*.ts', color: '#3B82F6' },
      { id: 'disabled-node', pattern: '*.ts', color: '#EF4444', disabled: true },
      { id: 'active-edge', pattern: 'import', color: '#22C55E', target: 'edge' },
    ];
    const pluginStatuses: IPluginStatus[] = [
      {
        id: 'typescript',
        name: 'TypeScript',
        version: '1.0.0',
        supportedExtensions: ['.ts'],
        status: 'active',
        enabled: true,
        connectionCount: 1,
      },
    ];

    const result = buildExportData(data, legends, pluginStatuses);

    expect(result.summary).toEqual({
      totalNodes: 2,
      totalEdges: 1,
      totalLegendRules: 2,
      totalImages: 0,
    });
    expect(result.legend.map((rule) => rule.id)).toEqual(['active-node', 'active-edge']);
    expect(result.nodes).toEqual([
      {
        id: 'src/App.ts',
        label: 'App.ts',
        nodeType: 'file',
        color: '#FFFFFF',
        legendIds: ['active-node'],
        fileSize: undefined,
        accessCount: undefined,
        x: undefined,
        y: undefined,
      },
      {
        id: 'src/lib.ts',
        label: 'lib.ts',
        nodeType: 'file',
        color: '#FFFFFF',
        legendIds: ['active-node'],
        fileSize: undefined,
        accessCount: undefined,
        x: undefined,
        y: undefined,
      },
    ]);
    expect(result.edges).toEqual([
      {
        id: 'src/App.ts->src/lib.ts#import',
        from: 'src/App.ts',
        to: 'src/lib.ts',
        kind: 'import',
        color: undefined,
        legendIds: ['active-node', 'active-edge'],
        sources: [
          {
            id: 'typescript:import',
            pluginId: 'typescript',
            pluginName: 'TypeScript',
            sourceId: 'import',
            label: 'Import',
            variant: undefined,
            metadata: undefined,
          },
        ],
      },
    ]);
  });
});
