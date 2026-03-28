import { afterEach, describe, it, expect, vi } from 'vitest';

const markdownHarness = vi.hoisted(() => ({
  postMessage: vi.fn(),
}));

vi.mock('../../../src/webview/vscodeApi', () => ({
  postMessage: markdownHarness.postMessage,
}));

vi.mock('../../../src/webview/export/exportContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/webview/export/exportContext')>();
  return {
    ...actual,
    createExportTimestamp: () => '2026-03-16T12-34-56',
  };
});

import { buildMarkdownExport, exportAsMarkdown } from '../../../src/webview/export/markdown';
import type { IGraphData, IGroup, IPluginStatus } from '../../../src/shared/contracts';
import { graphStore } from '../../../src/webview/store';

const noGroups: IGroup[] = [];
const initialStoreState = {
  currentCommitSha: graphStore.getState().currentCommitSha,
  groups: graphStore.getState().groups,
  pluginStatuses: graphStore.getState().pluginStatuses,
  timelineActive: graphStore.getState().timelineActive,
};

afterEach(() => {
  graphStore.setState(initialStoreState);
  markdownHarness.postMessage.mockReset();
  vi.restoreAllMocks();
});

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

  it('posts a timestamped markdown export message through the webview api', () => {
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

    exportAsMarkdown(data);

    expect(markdownHarness.postMessage).toHaveBeenCalledWith({
      type: 'EXPORT_MD',
      payload: {
        markdown: [
          '# CodeGraphy Export',
          '',
          '> 1 files, 0 connections',
          '> timeline commit: abc123',
          '',
          '## Connections',
          '',
          '### Groups',
          '',
          '#### `*.tsx`',
          '- style: #3B82F6',
          '- src/App.tsx',
          '',
          '## Images',
          '',
          '- none',
          '',
        ].join('\n'),
        filename: 'codegraphy-connections-2026-03-16T12-34-56.md',
      },
    });
  });

  it('logs markdown export failures instead of throwing', () => {
    const error = new Error('markdown failed');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    markdownHarness.postMessage.mockImplementation(() => {
      throw error;
    });

    exportAsMarkdown({ nodes: [], edges: [] });

    expect(consoleError).toHaveBeenCalledWith('[CodeGraphy] Markdown export failed:', error);
  });
});
