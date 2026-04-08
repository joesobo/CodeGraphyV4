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

import { buildExportData, exportAsJson, UNATTRIBUTED_RULE_KEY } from '../../../../src/webview/export/json/export';
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
    expect(result.version).toBe('2.0');
    expect(result.scope.graph).toBe('current-view');
    expect(result.scope.timeline).toEqual({ active: false, commitSha: null });
    expect(result.summary).toEqual({
      totalFiles: 0,
      totalConnections: 0,
      totalRules: 0,
      totalGroups: 0,
      totalImages: 0,
    });
    expect(result.sections.connections).toEqual({
      sources: {},
      groups: {},
      ungrouped: {},
    });
    expect(result.sections.images).toEqual({});
  });

  it('uses timeline scope context when provided', () => {
    const data: IGraphData = { nodes: [], edges: [] };
    const result = buildExportData(data, noGroups, [], { timelineActive: true, currentCommitSha: 'abc123' });
    expect(result.scope.timeline).toEqual({ active: true, commitSha: 'abc123' });
  });

  it('builds source-attributed imports and computes source counts from edges', () => {
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
    expect(result.sections.connections.ungrouped['a.ts'].imports).toEqual({
      'ts:es6': ['b.ts'],
      'ts:dynamic': ['c.ts'],
    });
    expect(result.sections.connections.sources['ts:es6']).toEqual({
      name: 'ES6 Import', plugin: 'TS', connections: 1,
    });
    expect(result.sections.connections.sources['ts:dynamic']).toEqual({
      name: 'Dynamic Import', plugin: 'TS', connections: 1,
    });
  });

  it('falls back to unattributed imports when edges have no source identifiers', () => {
    const data: IGraphData = {
      nodes: [
        { id: 'a.ts', label: 'a.ts', color: '#fff' },
        { id: 'b.ts', label: 'b.ts', color: '#fff' },
      ],
      edges: [{ id: 'e1', from: 'a.ts', to: 'b.ts' , kind: 'import', sources: [] }],
    };

    const result = buildExportData(data, noGroups);
    expect(result.sections.connections.ungrouped['a.ts'].imports).toEqual({
      [UNATTRIBUTED_RULE_KEY]: ['b.ts'],
    });
    expect(result.sections.connections.sources).toEqual({});
  });

  it('resolves source ids to qualified ids when unambiguous', () => {
    const data: IGraphData = {
      nodes: [
        { id: 'a.ts', label: 'a.ts', color: '#fff' },
        { id: 'b.ts', label: 'b.ts', color: '#fff' },
      ],
      edges: [{ id: 'e1', from: 'a.ts', to: 'b.ts', kind: 'import', sources: [{ id: 'ts:any', pluginId: 'ts', sourceId: 'es6', label: 'ES6 Import' }] }],
    };
    const plugins: IPluginStatus[] = [{
      id: 'ts', name: 'TS', version: '1.0.0', supportedExtensions: ['.ts'],
      status: 'active', enabled: true, connectionCount: 1,
      sources: [{ id: 'es6', qualifiedSourceId: 'ts:es6', name: 'ES6 Import', description: '', enabled: true, connectionCount: 1 }],
    }];

    const result = buildExportData(data, noGroups, plugins);
    expect(result.sections.connections.ungrouped['a.ts'].imports).toEqual({ 'ts:es6': ['b.ts'] });
    expect(result.sections.connections.sources['ts:es6']).toBeDefined();
  });

  it('nests files under groups and separates ungrouped files', () => {
    const data: IGraphData = {
      nodes: [
        { id: 'src/App.tsx', label: 'App.tsx', color: '#fff' },
        { id: 'src/utils.ts', label: 'utils.ts', color: '#fff' },
        { id: 'README.md', label: 'README.md', color: '#fff' },
      ],
      edges: [],
    };
    const groups: IGroup[] = [
      { id: '1', pattern: '*.tsx', color: '#3B82F6' },
      { id: '2', pattern: '*.ts', color: '#10B981' },
    ];

    const result = buildExportData(data, groups);
    expect(result.sections.connections.groups['*.tsx'].files['src/App.tsx']).toBeDefined();
    expect(result.sections.connections.groups['*.ts'].files['src/utils.ts']).toBeDefined();
    expect(result.sections.connections.ungrouped['README.md']).toBeDefined();
  });

  it('builds image section keyed by image path', () => {
    const data: IGraphData = {
      nodes: [{ id: 'src/App.tsx', label: 'App.tsx', color: '#fff' }],
      edges: [],
    };
    const groups: IGroup[] = [
      { id: '1', pattern: '*.tsx', color: '#3B82F6', imagePath: '.codegraphy/images/app.png' },
    ];

    const result = buildExportData(data, groups);
    expect(result.sections.images['.codegraphy/images/app.png']).toEqual({ groups: ['*.tsx'] });
  });

  it('omits default shape values from group style output', () => {
    const data: IGraphData = {
      nodes: [{ id: 'test.tsx', label: 'test.tsx', color: '#fff' }],
      edges: [],
    };
    const groups: IGroup[] = [
      { id: '1', pattern: '*.tsx', color: '#3B82F6', shape2D: 'circle', shape3D: 'sphere' },
    ];

    const result = buildExportData(data, groups);
    expect(result.sections.connections.groups['*.tsx'].style.shape2D).toBeUndefined();
    expect(result.sections.connections.groups['*.tsx'].style.shape3D).toBeUndefined();
  });

  it('includes non-default shape values in group style output', () => {
    const data: IGraphData = {
      nodes: [{ id: 'test.tsx', label: 'test.tsx', color: '#fff' }],
      edges: [],
    };
    const groups: IGroup[] = [
      { id: '1', pattern: '*.tsx', color: '#3B82F6', shape2D: 'diamond', shape3D: 'octahedron' },
    ];

    const result = buildExportData(data, groups);
    expect(result.sections.connections.groups['*.tsx'].style.shape2D).toBe('diamond');
    expect(result.sections.connections.groups['*.tsx'].style.shape3D).toBe('octahedron');
  });

  it('sorts file keys alphabetically within ungrouped output', () => {
    const data: IGraphData = {
      nodes: [
        { id: 'z.ts', label: 'z.ts', color: '#fff' },
        { id: 'a.ts', label: 'a.ts', color: '#fff' },
        { id: 'm.ts', label: 'm.ts', color: '#fff' },
      ],
      edges: [],
    };

    const result = buildExportData(data, noGroups);
    expect(Object.keys(result.sections.connections.ungrouped)).toEqual(['a.ts', 'm.ts', 'z.ts']);
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
        filename: 'codegraphy-connections-2026-03-16T12-34-56.json',
      },
    });
    const message = jsonHarness.postMessage.mock.calls[0][0] as {
      payload: { json: string };
    };
    expect(JSON.parse(message.payload.json)).toEqual({
      format: 'codegraphy-export',
      version: '2.0',
      exportedAt: expect.any(String),
      scope: {
        graph: 'current-view',
        timeline: {
          active: true,
          commitSha: 'abc123',
        },
      },
      summary: {
        totalFiles: 1,
        totalConnections: 0,
        totalRules: 0,
        totalGroups: 1,
        totalImages: 0,
      },
      sections: {
        connections: {
          sources: {},
          groups: {
            '*.tsx': {
              style: {
                color: '#3B82F6',
              },
              files: {
                'src/App.tsx': {},
              },
            },
          },
          ungrouped: {},
        },
        images: {},
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
