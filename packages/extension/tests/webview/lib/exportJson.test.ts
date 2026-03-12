import { describe, it, expect } from 'vitest';
import { buildExportData, UNATTRIBUTED_RULE_KEY } from '../../../src/webview/lib/export/exportJson';
import type { IGraphData, IGroup, IPluginStatus } from '../../../src/shared/types';

const noGroups: IGroup[] = [];

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
      rules: {},
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

  it('builds rule-attributed imports and computes rule counts from edges', () => {
    const data: IGraphData = {
      nodes: [
        { id: 'a.ts', label: 'a.ts', color: '#fff' },
        { id: 'b.ts', label: 'b.ts', color: '#fff' },
        { id: 'c.ts', label: 'c.ts', color: '#fff' },
      ],
      edges: [
        { id: 'e1', from: 'a.ts', to: 'b.ts', ruleIds: ['ts:es6'] },
        { id: 'e2', from: 'a.ts', to: 'c.ts', ruleIds: ['ts:dynamic'] },
      ],
    };
    const plugins: IPluginStatus[] = [{
      id: 'ts', name: 'TS', version: '1.0.0', supportedExtensions: ['.ts'],
      status: 'active', enabled: true, connectionCount: 2,
      rules: [
        { id: 'es6', qualifiedId: 'ts:es6', name: 'ES6 Import', description: '', enabled: true, connectionCount: 99 },
        { id: 'dynamic', qualifiedId: 'ts:dynamic', name: 'Dynamic Import', description: '', enabled: true, connectionCount: 99 },
      ],
    }];

    const result = buildExportData(data, noGroups, plugins);
    expect(result.sections.connections.ungrouped['a.ts'].imports).toEqual({
      'ts:es6': ['b.ts'],
      'ts:dynamic': ['c.ts'],
    });
    expect(result.sections.connections.rules['ts:es6']).toEqual({
      name: 'ES6 Import', plugin: 'TS', connections: 1,
    });
    expect(result.sections.connections.rules['ts:dynamic']).toEqual({
      name: 'Dynamic Import', plugin: 'TS', connections: 1,
    });
  });

  it('falls back to unattributed imports when edges have no rule identifiers', () => {
    const data: IGraphData = {
      nodes: [
        { id: 'a.ts', label: 'a.ts', color: '#fff' },
        { id: 'b.ts', label: 'b.ts', color: '#fff' },
      ],
      edges: [{ id: 'e1', from: 'a.ts', to: 'b.ts' }],
    };

    const result = buildExportData(data, noGroups);
    expect(result.sections.connections.ungrouped['a.ts'].imports).toEqual({
      [UNATTRIBUTED_RULE_KEY]: ['b.ts'],
    });
    expect(result.sections.connections.rules).toEqual({});
  });

  it('supports legacy ruleId by resolving to qualified rule when unambiguous', () => {
    const data: IGraphData = {
      nodes: [
        { id: 'a.ts', label: 'a.ts', color: '#fff' },
        { id: 'b.ts', label: 'b.ts', color: '#fff' },
      ],
      edges: [{ id: 'e1', from: 'a.ts', to: 'b.ts', ruleId: 'es6' }],
    };
    const plugins: IPluginStatus[] = [{
      id: 'ts', name: 'TS', version: '1.0.0', supportedExtensions: ['.ts'],
      status: 'active', enabled: true, connectionCount: 1,
      rules: [{ id: 'es6', qualifiedId: 'ts:es6', name: 'ES6 Import', description: '', enabled: true, connectionCount: 1 }],
    }];

    const result = buildExportData(data, noGroups, plugins);
    expect(result.sections.connections.ungrouped['a.ts'].imports).toEqual({ 'ts:es6': ['b.ts'] });
    expect(result.sections.connections.rules['ts:es6']).toBeDefined();
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
});
