import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../src/shared/graph/contracts';
vi.mock('../../../../src/webview/vscodeApi', () => ({ postMessage: vi.fn() }));

import { buildExportData } from '../../../../src/webview/export/json/export';
import type { IGroup } from '../../../../src/shared/settings/groups';

const noLegends: IGroup[] = [];

describe('buildExportData nodes', () => {
  it('adds legend ids to nodes based on the active legend rules', () => {
    const data: IGraphData = {
      nodes: [
        { id: 'src/App.tsx', label: 'App.tsx', color: '#fff' },
        { id: 'README.md', label: 'README.md', color: '#fff' },
      ],
      edges: [],
    };
    const legends: IGroup[] = [{ id: 'g1', pattern: '*.tsx', color: '#3B82F6' }];

    const result = buildExportData(data, legends);
    expect(result.legend).toEqual([
      {
        id: 'g1',
        pattern: '*.tsx',
        color: '#3B82F6',
        target: 'node',
        shape2D: undefined,
        imagePath: undefined,
        imageUrl: undefined,
        disabled: undefined,
        isPluginDefault: undefined,
        pluginName: undefined,
      },
    ]);
    expect(result.nodes).toEqual([
      {
        id: 'README.md',
        label: 'README.md',
        nodeType: 'file',
        color: '#fff',
        legendIds: [],
        fileSize: undefined,
        x: undefined,
        y: undefined,
      },
      {
        id: 'src/App.tsx',
        label: 'App.tsx',
        nodeType: 'file',
        color: '#fff',
        legendIds: ['g1'],
        fileSize: undefined,
        x: undefined,
        y: undefined,
      },
    ]);
  });

  it('exports symbol node metadata from the current visible graph', () => {
    const data: IGraphData = {
      nodes: [
        {
          id: 'src/App.ts#render:function',
          label: 'render',
          nodeType: 'symbol',
          color: '#8B5CF6',
          symbol: {
            id: 'src/App.ts#render:function',
            name: 'render',
            kind: 'function',
            filePath: 'src/App.ts',
            signature: 'render(): string',
            language: 'typescript',
            source: 'typescript',
            pluginKind: 'function-declaration',
          },
        },
      ],
      edges: [],
    };

    const result = buildExportData(data, noLegends);

    expect(result.nodes).toEqual([
      {
        id: 'src/App.ts#render:function',
        label: 'render',
        nodeType: 'symbol',
        color: '#8B5CF6',
        legendIds: [],
        fileSize: undefined,
        x: undefined,
        y: undefined,
        symbol: {
          id: 'src/App.ts#render:function',
          name: 'render',
          kind: 'function',
          filePath: 'src/App.ts',
          signature: 'render(): string',
          language: 'typescript',
          source: 'typescript',
          pluginKind: 'function-declaration',
        },
      },
    ]);
  });

});
