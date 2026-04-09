import { afterEach, describe, it, expect, vi } from 'vitest';

const jsonHarness = vi.hoisted(() => ({
  postMessage: vi.fn(),
}));

vi.mock('../../../../src/webview/vscodeApi', () => ({
  postMessage: jsonHarness.postMessage,
}));

vi.mock('../../../../src/webview/export/shared/context', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../src/webview/export/shared/context')>();
  return {
    ...actual,
    createExportTimestamp: () => '2026-03-16T12-34-56',
  };
});

import { buildExportData, exportAsJson } from '../../../../src/webview/export/json/export';
import type { IGraphData } from '../../../../src/shared/graph/types';
import type { IPluginStatus } from '../../../../src/shared/plugins/status';
import type { IGroup } from '../../../../src/shared/settings/groups';
import { graphStore } from '../../../../src/webview/store/state';

const noGroups: IGroup[] = [];
const initialStoreState = {
  currentCommitSha: graphStore.getState().currentCommitSha,
  groups: graphStore.getState().groups,
  pluginStatuses: graphStore.getState().pluginStatuses,
  timelineActive: graphStore.getState().timelineActive,
};

afterEach(() => {
  graphStore.setState(initialStoreState);
  jsonHarness.postMessage.mockReset();
  vi.restoreAllMocks();
});

describe('buildExportData', () => {
  it('returns labeled top-level sections for an empty graph', () => {
    const data: IGraphData = { nodes: [], edges: [] };
    const result = buildExportData(data, noGroups);

    expect(result.format).toBe('codegraphy-export');
    expect(result.version).toBe('3.0');
    expect(result.scope.graph).toBe('current-view');
    expect(result.scope.timeline).toEqual({ active: false, commitSha: null });
    expect(result.summary).toEqual({
      totalNodes: 0,
      totalEdges: 0,
      totalLegendRules: 0,
      totalImages: 0,
    });
    expect(result.sections.legend).toEqual([]);
    expect(result.sections.nodes).toEqual([]);
    expect(result.sections.edges).toEqual([]);
  });

  it('uses timeline scope context when provided', () => {
    const data: IGraphData = { nodes: [], edges: [] };
    const result = buildExportData(data, noGroups, [], { timelineActive: true, currentCommitSha: 'abc123' });
    expect(result.scope.timeline).toEqual({ active: true, commitSha: 'abc123' });
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
      sources: [
        { id: 'es6', qualifiedSourceId: 'ts:es6', name: 'ES6 Import', description: '', enabled: true, connectionCount: 99 },
        { id: 'dynamic', qualifiedSourceId: 'ts:dynamic', name: 'Dynamic Import', description: '', enabled: true, connectionCount: 99 },
      ],
    }];

    const result = buildExportData(data, noGroups, plugins);
    expect(result.sections.nodes.map((node) => node.id)).toEqual(['a.ts', 'b.ts', 'c.ts']);
    expect(result.sections.edges).toEqual([
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

  it('keeps edges without sources instead of synthesizing old connection buckets', () => {
    const data: IGraphData = {
      nodes: [
        { id: 'a.ts', label: 'a.ts', color: '#fff' },
        { id: 'b.ts', label: 'b.ts', color: '#fff' },
      ],
      edges: [{ id: 'e1', from: 'a.ts', to: 'b.ts' , kind: 'import', sources: [] }],
    };

    const result = buildExportData(data, noGroups);
    expect(result.sections.edges).toEqual([
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

  it('adds legend ids to nodes based on the active legend rules', () => {
    const data: IGraphData = {
      nodes: [
        { id: 'src/App.tsx', label: 'App.tsx', color: '#fff' },
        { id: 'README.md', label: 'README.md', color: '#fff' },
      ],
      edges: [],
    };
    const groups: IGroup[] = [{ id: 'g1', pattern: '*.tsx', color: '#3B82F6' }];

    const result = buildExportData(data, groups);
    expect(result.sections.legend).toEqual([
      {
        id: 'g1',
        pattern: '*.tsx',
        color: '#3B82F6',
        target: 'node',
        shape2D: undefined,
        shape3D: undefined,
        imagePath: undefined,
        imageUrl: undefined,
        disabled: undefined,
        isPluginDefault: undefined,
        pluginName: undefined,
      },
    ]);
    expect(result.sections.nodes).toEqual([
      {
        id: 'README.md',
        label: 'README.md',
        nodeType: 'file',
        color: '#fff',
        legendIds: [],
        fileSize: undefined,
        accessCount: undefined,
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
        accessCount: undefined,
        x: undefined,
        y: undefined,
      },
    ]);
  });

  it('counts legend images from active legend rules', () => {
    const data: IGraphData = {
      nodes: [{ id: 'src/App.tsx', label: 'App.tsx', color: '#fff' }],
      edges: [],
    };
    const groups: IGroup[] = [
      { id: '1', pattern: '*.tsx', color: '#3B82F6', imagePath: '.codegraphy/images/app.png' },
    ];

    const result = buildExportData(data, groups);
    expect(result.summary.totalImages).toBe(1);
  });

  it('posts a timestamped json export message through the webview api', () => {
    const data: IGraphData = {
      nodes: [{ id: 'src/App.tsx', label: 'App.tsx', color: '#fff' }],
      edges: [],
    };
    graphStore.setState({
      currentCommitSha: 'abc123',
      groups: [{ id: 'g1', pattern: '*.tsx', color: '#3B82F6' }],
      pluginStatuses: [],
      timelineActive: true,
    });

    exportAsJson(data);

    expect(jsonHarness.postMessage).toHaveBeenCalledWith({
      type: 'EXPORT_JSON',
      payload: {
        json: expect.any(String),
        filename: 'codegraphy-graph-2026-03-16T12-34-56.json',
      },
    });
    const message = jsonHarness.postMessage.mock.calls[0][0] as {
      payload: { json: string };
    };
    expect(JSON.parse(message.payload.json)).toEqual({
      format: 'codegraphy-export',
      version: '3.0',
      exportedAt: expect.any(String),
      scope: {
        graph: 'current-view',
        timeline: {
          active: true,
          commitSha: 'abc123',
        },
      },
      summary: {
        totalNodes: 1,
        totalEdges: 0,
        totalLegendRules: 1,
        totalImages: 0,
      },
      sections: {
        legend: [
          {
            id: 'g1',
            pattern: '*.tsx',
            color: '#3B82F6',
            target: 'node',
          },
        ],
        nodes: [
          {
            id: 'src/App.tsx',
            label: 'App.tsx',
            nodeType: 'file',
            color: '#fff',
            legendIds: ['g1'],
          },
        ],
        edges: [],
      },
    });
  });

  it('logs json export failures instead of throwing', () => {
    const error = new Error('json failed');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    jsonHarness.postMessage.mockImplementation(() => {
      throw error;
    });

    exportAsJson({ nodes: [], edges: [] });

    expect(consoleError).toHaveBeenCalledWith('[CodeGraphy] JSON export failed:', error);
  });
});
