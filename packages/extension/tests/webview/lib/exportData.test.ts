import { describe, it, expect } from 'vitest';
import { buildExportData } from '../../../src/webview/lib/exportData';
import type { IGraphData, IGroup, IPluginStatus } from '../../../src/shared/types';

const noGroups: IGroup[] = [];

describe('buildExportData', () => {
  it('returns correct format and version for an empty graph', () => {
    const data: IGraphData = { nodes: [], edges: [] };
    const result = buildExportData(data, noGroups);
    expect(result.format).toBe('codegraphy-connections');
    expect(result.version).toBe('1.0');
    expect(result.stats).toEqual({ totalFiles: 0, totalConnections: 0 });
    expect(result.groups).toEqual({});
    expect(result.ungrouped).toEqual({});
    expect(result.rules).toEqual({});
  });

  it('builds node-centric connections from edges', () => {
    const data: IGraphData = {
      nodes: [
        { id: 'src/App.tsx', label: 'App.tsx', color: '#fff' },
        { id: 'src/Graph.tsx', label: 'Graph.tsx', color: '#fff' },
        { id: 'src/store.ts', label: 'store.ts', color: '#fff' },
      ],
      edges: [
        { id: 'e1', from: 'src/App.tsx', to: 'src/Graph.tsx' },
        { id: 'e2', from: 'src/App.tsx', to: 'src/store.ts' },
      ],
    };

    const result = buildExportData(data, noGroups);
    const appImports = result.ungrouped['src/App.tsx'].imports;
    expect(appImports).toEqual([
      { file: 'src/Graph.tsx' },
      { file: 'src/store.ts' },
    ]);
    expect(result.ungrouped['src/Graph.tsx'].imports).toEqual([]);
    expect(result.ungrouped['src/store.ts'].imports).toEqual([]);
  });

  it('includes ruleIds on imports when edges have them', () => {
    const data: IGraphData = {
      nodes: [
        { id: 'a.ts', label: 'a.ts', color: '#fff' },
        { id: 'b.ts', label: 'b.ts', color: '#fff' },
      ],
      edges: [
        { id: 'e1', from: 'a.ts', to: 'b.ts', ruleIds: ['codegraphy.typescript:es6-import'] },
      ],
    };
    const plugins: IPluginStatus[] = [
      {
        id: 'codegraphy.typescript', name: 'TypeScript', version: '1.0.0',
        supportedExtensions: ['.ts'], status: 'active', enabled: true, connectionCount: 1,
        rules: [
          { id: 'es6-import', qualifiedId: 'codegraphy.typescript:es6-import', name: 'ES6 Import', description: '', enabled: true, connectionCount: 1 },
        ],
      },
    ];

    const result = buildExportData(data, noGroups, plugins);
    expect(result.ungrouped['a.ts'].imports).toEqual([
      { file: 'b.ts', rules: ['codegraphy.typescript:es6-import'] },
    ]);
  });

  it('nests files under their matching group', () => {
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
    expect(result.groups['*.tsx'].files['src/App.tsx']).toBeDefined();
    expect(result.groups['*.ts'].files['src/utils.ts']).toBeDefined();
    expect(result.ungrouped['README.md']).toBeDefined();
    expect(Object.keys(result.ungrouped)).toHaveLength(1);
  });

  it('only includes groups that match at least one node', () => {
    const data: IGraphData = {
      nodes: [{ id: 'src/App.tsx', label: 'App.tsx', color: '#fff' }],
      edges: [],
    };
    const groups: IGroup[] = [
      { id: '1', pattern: '*.tsx', color: '#3B82F6' },
      { id: '2', pattern: '*.py', color: '#10B981' },
    ];

    const result = buildExportData(data, groups);
    expect(result.groups).toHaveProperty('*.tsx');
    expect(result.groups).not.toHaveProperty('*.py');
  });

  it('excludes disabled groups', () => {
    const data: IGraphData = {
      nodes: [{ id: 'src/App.tsx', label: 'App.tsx', color: '#fff' }],
      edges: [],
    };
    const groups: IGroup[] = [
      { id: '1', pattern: '*.tsx', color: '#3B82F6', disabled: true },
    ];

    const result = buildExportData(data, groups);
    expect(result.groups).toEqual({});
    expect(result.ungrouped['src/App.tsx']).toBeDefined();
  });

  it('omits default shape values from group output', () => {
    const data: IGraphData = {
      nodes: [{ id: 'test.tsx', label: 'test.tsx', color: '#fff' }],
      edges: [],
    };
    const groups: IGroup[] = [
      { id: '1', pattern: '*.tsx', color: '#3B82F6', shape2D: 'circle', shape3D: 'sphere' },
    ];

    const result = buildExportData(data, groups);
    expect(result.groups['*.tsx'].shape2D).toBeUndefined();
    expect(result.groups['*.tsx'].shape3D).toBeUndefined();
  });

  it('includes non-default shapes in group output', () => {
    const data: IGraphData = {
      nodes: [{ id: 'test.tsx', label: 'test.tsx', color: '#fff' }],
      edges: [],
    };
    const groups: IGroup[] = [
      { id: '1', pattern: '*.tsx', color: '#3B82F6', shape2D: 'diamond', shape3D: 'octahedron' },
    ];

    const result = buildExportData(data, groups);
    expect(result.groups['*.tsx'].shape2D).toBe('diamond');
    expect(result.groups['*.tsx'].shape3D).toBe('octahedron');
  });

  it('stats match actual node and edge counts', () => {
    const data: IGraphData = {
      nodes: [
        { id: 'a.ts', label: 'a.ts', color: '#fff' },
        { id: 'b.ts', label: 'b.ts', color: '#fff' },
        { id: 'c.ts', label: 'c.ts', color: '#fff' },
      ],
      edges: [
        { id: 'e1', from: 'a.ts', to: 'b.ts' },
        { id: 'e2', from: 'b.ts', to: 'c.ts' },
      ],
    };

    const result = buildExportData(data, noGroups);
    expect(result.stats.totalFiles).toBe(3);
    expect(result.stats.totalConnections).toBe(2);
  });

  it('sorts files alphabetically within groups and ungrouped', () => {
    const data: IGraphData = {
      nodes: [
        { id: 'z.ts', label: 'z.ts', color: '#fff' },
        { id: 'a.ts', label: 'a.ts', color: '#fff' },
        { id: 'm.ts', label: 'm.ts', color: '#fff' },
      ],
      edges: [],
    };

    const result = buildExportData(data, noGroups);
    const keys = Object.keys(result.ungrouped);
    expect(keys).toEqual(['a.ts', 'm.ts', 'z.ts']);
  });

  it('includes active rules keyed by qualified ID', () => {
    const data: IGraphData = { nodes: [], edges: [] };
    const plugins: IPluginStatus[] = [
      {
        id: 'codegraphy.typescript',
        name: 'TypeScript/JavaScript',
        version: '1.0.0',
        supportedExtensions: ['.ts', '.tsx'],
        status: 'active',
        enabled: true,
        connectionCount: 50,
        rules: [
          { id: 'es6-import', qualifiedId: 'codegraphy.typescript:es6-import', name: 'ES6 Import', description: '', enabled: true, connectionCount: 30 },
          { id: 'dynamic-import', qualifiedId: 'codegraphy.typescript:dynamic-import', name: 'Dynamic Import', description: '', enabled: true, connectionCount: 20 },
          { id: 'require', qualifiedId: 'codegraphy.typescript:require', name: 'Require', description: '', enabled: true, connectionCount: 0 },
        ],
      },
    ];

    const result = buildExportData(data, noGroups, plugins);
    expect(Object.keys(result.rules)).toHaveLength(2);
    expect(result.rules['codegraphy.typescript:es6-import']).toEqual({
      name: 'ES6 Import', plugin: 'TypeScript/JavaScript', connections: 30,
    });
    expect(result.rules['codegraphy.typescript:dynamic-import']).toEqual({
      name: 'Dynamic Import', plugin: 'TypeScript/JavaScript', connections: 20,
    });
    // 'require' excluded (0 connections)
    expect(result.rules['codegraphy.typescript:require']).toBeUndefined();
  });

  it('excludes rules from disabled plugins', () => {
    const data: IGraphData = { nodes: [], edges: [] };
    const plugins: IPluginStatus[] = [
      {
        id: 'codegraphy.typescript',
        name: 'TypeScript/JavaScript',
        version: '1.0.0',
        supportedExtensions: ['.ts'],
        status: 'active',
        enabled: false,
        connectionCount: 10,
        rules: [
          { id: 'es6-import', qualifiedId: 'codegraphy.typescript:es6-import', name: 'ES6 Import', description: '', enabled: true, connectionCount: 10 },
        ],
      },
    ];

    const result = buildExportData(data, noGroups, plugins);
    expect(Object.keys(result.rules)).toHaveLength(0);
  });

  it('excludes disabled rules', () => {
    const data: IGraphData = { nodes: [], edges: [] };
    const plugins: IPluginStatus[] = [
      {
        id: 'codegraphy.typescript',
        name: 'TypeScript/JavaScript',
        version: '1.0.0',
        supportedExtensions: ['.ts'],
        status: 'active',
        enabled: true,
        connectionCount: 10,
        rules: [
          { id: 'es6-import', qualifiedId: 'codegraphy.typescript:es6-import', name: 'ES6 Import', description: '', enabled: false, connectionCount: 10 },
        ],
      },
    ];

    const result = buildExportData(data, noGroups, plugins);
    expect(Object.keys(result.rules)).toHaveLength(0);
  });
});
