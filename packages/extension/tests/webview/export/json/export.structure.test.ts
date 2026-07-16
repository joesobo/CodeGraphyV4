import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../src/shared/graph/contracts';
import type { IPluginStatus } from '../../../../src/shared/plugins/status';
vi.mock('../../../../src/webview/vscodeApi', () => ({ postMessage: vi.fn() }));

import { buildExportData } from '../../../../src/webview/export/json/export';
import type { IGroup } from '../../../../src/shared/settings/groups';

const noLegends: IGroup[] = [];

describe('buildExportData structure', () => {
  it('returns labeled top-level sections for an empty graph', () => {
    const data: IGraphData = { nodes: [], edges: [] };
    const result = buildExportData(data, noLegends);

    expect(result.format).toBe('codegraphy-export');
    expect(result.version).toBe('3.0');
    expect(result.scope.graph).toBe('current-view');
    expect(result.summary).toEqual({
      totalNodes: 0,
      totalEdges: 0,
      totalLegendRules: 0,
      totalImages: 0,
    });
    expect(result.legend).toEqual([]);
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
  });


  it('builds exported nodes and edges with source attribution', () => {
    const data: IGraphData = {
      nodes: [
        { id: 'a.ts', label: 'a.ts', color: '#fff' },
        { id: 'b.ts', label: 'b.ts', color: '#fff' },
        { id: 'c.ts', label: 'c.ts', color: '#fff' },
      ],
      edges: [
        { id: 'e1', from: 'a.ts', to: 'b.ts', kind: 'import', sources: [{ id: 'ts:es6', pluginId: 'ts', sourceId: 'es6', label: 'ES6 Import' }] },
        { id: 'e2', from: 'a.ts', to: 'c.ts', kind: 'import', sources: [{ id: 'ts:dynamic', pluginId: 'ts', sourceId: 'dynamic', label: 'Dynamic Import' }] },
      ],
    };
    const plugins: IPluginStatus[] = [{
      id: 'ts', name: 'TS', version: '1.0.0', supportedExtensions: ['.ts'],
      status: 'active', enabled: true, connectionCount: 2,
    }];

    const result = buildExportData(data, noLegends, plugins);
    expect(result.nodes.map((node) => node.id)).toEqual(['a.ts', 'b.ts', 'c.ts']);
    expect(result.edges).toEqual([
      {
        id: 'e1',
        from: 'a.ts',
        to: 'b.ts',
        kind: 'import',
        color: undefined,
        legendIds: [],
        sources: [
          {
            id: 'ts:es6',
            pluginId: 'ts',
            pluginName: 'TS',
            sourceId: 'es6',
            label: 'ES6 Import',
            variant: undefined,
            metadata: undefined,
          },
        ],
      },
      {
        id: 'e2',
        from: 'a.ts',
        to: 'c.ts',
        kind: 'import',
        color: undefined,
        legendIds: [],
        sources: [
          {
            id: 'ts:dynamic',
            pluginId: 'ts',
            pluginName: 'TS',
            sourceId: 'dynamic',
            label: 'Dynamic Import',
            variant: undefined,
            metadata: undefined,
          },
        ],
      },
    ]);
  });

});
