import { describe, it, expect } from 'vitest';
import { buildMarkdownExport } from '../../../src/webview/lib/exportMd';
import type { IGraphData, IGroup, IPluginStatus } from '../../../src/shared/types';

const noGroups: IGroup[] = [];

describe('buildMarkdownExport', () => {
  it('produces valid markdown with zero stats for an empty graph', () => {
    const data: IGraphData = { nodes: [], edges: [] };
    const result = buildMarkdownExport(data, noGroups);
    expect(result).toContain('# CodeGraphy Export');
    expect(result).toContain('0 files, 0 connections');
  });

  it('lists files with imports as bold with nested items', () => {
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

    const result = buildMarkdownExport(data, noGroups);
    expect(result).toContain('- **src/App.tsx**');
    expect(result).toContain('  - src/Graph.tsx');
    expect(result).toContain('  - src/store.ts');
  });

  it('lists orphan nodes without bold', () => {
    const data: IGraphData = {
      nodes: [{ id: 'orphan.ts', label: 'orphan.ts', color: '#fff' }],
      edges: [],
    };

    const result = buildMarkdownExport(data, noGroups);
    expect(result).toContain('- orphan.ts');
    expect(result).not.toContain('**orphan.ts**');
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

    const result = buildMarkdownExport(data, noGroups);
    const aIdx = result.indexOf('a.ts');
    const mIdx = result.indexOf('m.ts');
    const zIdx = result.indexOf('z.ts');
    expect(aIdx).toBeLessThan(mIdx);
    expect(mIdx).toBeLessThan(zIdx);
  });

  it('stats match node and edge counts', () => {
    const data: IGraphData = {
      nodes: [
        { id: 'a.ts', label: 'a.ts', color: '#fff' },
        { id: 'b.ts', label: 'b.ts', color: '#fff' },
      ],
      edges: [{ id: 'e1', from: 'a.ts', to: 'b.ts' }],
    };

    const result = buildMarkdownExport(data, noGroups);
    expect(result).toContain('2 files, 1 connections');
  });

  it('groups files under group headings', () => {
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

    const result = buildMarkdownExport(data, groups);
    expect(result).toContain('`*.tsx`');
    expect(result).toContain('`*.ts`');
    expect(result).toContain('## Ungrouped');
    expect(result).toContain('README.md');
  });

  it('skips disabled groups', () => {
    const data: IGraphData = {
      nodes: [{ id: 'src/App.tsx', label: 'App.tsx', color: '#fff' }],
      edges: [],
    };
    const groups: IGroup[] = [
      { id: '1', pattern: '*.tsx', color: '#3B82F6', disabled: true },
    ];

    const result = buildMarkdownExport(data, groups);
    expect(result).not.toContain('`*.tsx`');
    expect(result).toContain('## Ungrouped');
  });

  it('includes rules section with connection counts and qualified IDs', () => {
    const data: IGraphData = {
      nodes: [{ id: 'a.ts', label: 'a.ts', color: '#fff' }],
      edges: [],
    };
    const plugins: IPluginStatus[] = [{
      id: 'ts', name: 'TypeScript', version: '1.0.0',
      supportedExtensions: ['.ts'], status: 'active', enabled: true, connectionCount: 15,
      rules: [
        { id: 'es6', qualifiedId: 'ts:es6', name: 'ES6 Import', description: '', enabled: true, connectionCount: 15 },
      ],
    }];

    const result = buildMarkdownExport(data, noGroups, plugins);
    expect(result).toContain('## Rules');
    expect(result).toContain('**ES6 Import**');
    expect(result).toContain('`ts:es6`');
    expect(result).toContain('15 connections');
  });

  it('groups imports by rule name under each file', () => {
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
      id: 'ts', name: 'TS', version: '1.0.0',
      supportedExtensions: ['.ts'], status: 'active', enabled: true, connectionCount: 2,
      rules: [
        { id: 'es6', qualifiedId: 'ts:es6', name: 'ES6 Import', description: '', enabled: true, connectionCount: 1 },
        { id: 'dynamic', qualifiedId: 'ts:dynamic', name: 'Dynamic Import', description: '', enabled: true, connectionCount: 1 },
      ],
    }];

    const result = buildMarkdownExport(data, noGroups, plugins);
    expect(result).toContain('*ES6 Import*');
    expect(result).toContain('    - b.ts');
    expect(result).toContain('*Dynamic Import*');
    expect(result).toContain('    - c.ts');
  });
});
