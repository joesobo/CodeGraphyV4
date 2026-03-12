import { describe, it, expect } from 'vitest';
import { buildMarkdownExport } from '../../../src/webview/lib/export/exportMarkdown';
import type { IGraphData, IGroup, IPluginStatus } from '../../../src/shared/types';

const noGroups: IGroup[] = [];

describe('buildMarkdownExport', () => {
  it('includes summary and labeled top-level sections', () => {
    const data: IGraphData = { nodes: [], edges: [] };
    const result = buildMarkdownExport(data, noGroups);

    expect(result).toContain('# CodeGraphy Export');
    expect(result).toContain('0 files, 0 connections');
    expect(result).toContain('## Connections');
    expect(result).toContain('## Images');
  });

  it('shows timeline scope when active', () => {
    const data: IGraphData = { nodes: [], edges: [] };
    const result = buildMarkdownExport(data, noGroups, [], {
      timelineActive: true,
      currentCommitSha: 'abc123',
    });

    expect(result).toContain('timeline commit: abc123');
  });

  it('renders rules and grouped imports', () => {
    const data: IGraphData = {
      nodes: [
        { id: 'a.ts', label: 'a.ts', color: '#fff' },
        { id: 'b.ts', label: 'b.ts', color: '#fff' },
      ],
      edges: [{ id: 'e1', from: 'a.ts', to: 'b.ts', ruleIds: ['ts:es6'] }],
    };
    const plugins: IPluginStatus[] = [{
      id: 'ts', name: 'TypeScript', version: '1.0.0', supportedExtensions: ['.ts'], status: 'active', enabled: true, connectionCount: 1,
      rules: [{ id: 'es6', qualifiedId: 'ts:es6', name: 'ES6 Import', description: '', enabled: true, connectionCount: 1 }],
    }];

    const result = buildMarkdownExport(data, noGroups, plugins);
    expect(result).toContain('### Rules');
    expect(result).toContain('**ES6 Import**');
    expect(result).toContain('*ES6 Import*');
    expect(result).toContain('    - b.ts');
  });

  it('renders groups and ungrouped files', () => {
    const data: IGraphData = {
      nodes: [
        { id: 'src/App.tsx', label: 'App.tsx', color: '#fff' },
        { id: 'README.md', label: 'README.md', color: '#fff' },
      ],
      edges: [],
    };
    const groups: IGroup[] = [{ id: 'g1', pattern: '*.tsx', color: '#3B82F6' }];

    const result = buildMarkdownExport(data, groups);
    expect(result).toContain('### Groups');
    expect(result).toContain('#### `*.tsx`');
    expect(result).toContain('### Ungrouped');
    expect(result).toContain('README.md');
  });

  it('renders image section entries with owning groups', () => {
    const data: IGraphData = {
      nodes: [{ id: 'src/App.tsx', label: 'App.tsx', color: '#fff' }],
      edges: [],
    };
    const groups: IGroup[] = [{
      id: 'g1', pattern: '*.tsx', color: '#3B82F6', imagePath: '.codegraphy/images/app.png',
    }];

    const result = buildMarkdownExport(data, groups);
    expect(result).toContain('## Images');
    expect(result).toContain('`.codegraphy/images/app.png`');
    expect(result).toContain('groups: `*.tsx`');
  });

  it('lists "none" when there are no groups or images', () => {
    const data: IGraphData = {
      nodes: [{ id: 'orphan.ts', label: 'orphan.ts', color: '#fff' }],
      edges: [],
    };

    const result = buildMarkdownExport(data, noGroups);
    expect(result).toContain('### Groups');
    expect(result).toContain('- none');
  });
});
