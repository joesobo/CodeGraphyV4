import { describe, it, expect } from 'vitest';
import { buildExportData } from '../../../src/webview/lib/exportData';
import type { IGraphData, IGroup } from '../../../src/shared/types';

const noGroups: IGroup[] = [];

describe('buildExportData', () => {
  it('returns correct format and version for an empty graph', () => {
    const data: IGraphData = { nodes: [], edges: [] };
    const result = buildExportData(data, noGroups);
    expect(result.format).toBe('codegraphy-connections');
    expect(result.version).toBe('1.0');
    expect(result.stats).toEqual({ totalFiles: 0, totalConnections: 0 });
    expect(result.files).toEqual({});
    expect(result.groups).toEqual({});
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
    expect(result.files['src/App.tsx'].imports).toEqual(['src/Graph.tsx', 'src/store.ts']);
    expect(result.files['src/Graph.tsx'].imports).toEqual([]);
    expect(result.files['src/store.ts'].imports).toEqual([]);
  });

  it('extracts file extensions correctly', () => {
    const data: IGraphData = {
      nodes: [
        { id: 'src/App.tsx', label: 'App.tsx', color: '#fff' },
        { id: 'src/utils.ts', label: 'utils.ts', color: '#fff' },
        { id: 'Makefile', label: 'Makefile', color: '#fff' },
      ],
      edges: [],
    };

    const result = buildExportData(data, noGroups);
    expect(result.files['src/App.tsx'].extension).toBe('.tsx');
    expect(result.files['src/utils.ts'].extension).toBe('.ts');
    expect(result.files['Makefile'].extension).toBe('');
  });

  it('assigns nodes to their first matching group', () => {
    const data: IGraphData = {
      nodes: [
        { id: 'src/App.tsx', label: 'App.tsx', color: '#fff' },
        { id: 'src/utils.ts', label: 'utils.ts', color: '#fff' },
      ],
      edges: [],
    };
    const groups: IGroup[] = [
      { id: '1', pattern: '*.tsx', color: '#3B82F6' },
      { id: '2', pattern: '*.ts', color: '#10B981' },
    ];

    const result = buildExportData(data, groups);
    expect(result.files['src/App.tsx'].group).toBe('*.tsx');
    expect(result.files['src/utils.ts'].group).toBe('*.ts');
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
    expect(result.files['src/App.tsx'].group).toBeUndefined();
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

  it('sorts files alphabetically', () => {
    const data: IGraphData = {
      nodes: [
        { id: 'z.ts', label: 'z.ts', color: '#fff' },
        { id: 'a.ts', label: 'a.ts', color: '#fff' },
        { id: 'm.ts', label: 'm.ts', color: '#fff' },
      ],
      edges: [],
    };

    const result = buildExportData(data, noGroups);
    const keys = Object.keys(result.files);
    expect(keys).toEqual(['a.ts', 'm.ts', 'z.ts']);
  });
});
