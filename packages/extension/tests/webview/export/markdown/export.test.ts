import { afterEach, describe, it, expect, vi } from 'vitest';

const markdownHarness = vi.hoisted(() => ({
  postMessage: vi.fn(),
}));

vi.mock('../../../../src/webview/vscodeApi', () => ({
  postMessage: markdownHarness.postMessage,
}));

vi.mock('../../../../src/webview/export/shared/context', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../src/webview/export/shared/context')>();
  return {
    ...actual,
    createExportTimestamp: () => '2026-03-16T12-34-56',
  };
});

import { buildMarkdownExport, exportAsMarkdown } from '../../../../src/webview/export/markdown/export';
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
  markdownHarness.postMessage.mockReset();
  vi.restoreAllMocks();
});

describe('buildMarkdownExport', () => {
  it('includes summary and labeled top-level sections', () => {
    const data: IGraphData = { nodes: [], edges: [] };
    const result = buildMarkdownExport(data, noGroups);

    expect(result).toContain('# CodeGraphy Export');
    expect(result).toContain('0 nodes, 0 edges');
    expect(result).toContain('## Legend');
    expect(result).toContain('## Nodes');
    expect(result).toContain('## Edges');
  });

  it('shows timeline scope when active', () => {
    const data: IGraphData = { nodes: [], edges: [] };
    const result = buildMarkdownExport(data, noGroups, [], {
      timelineActive: true,
      currentCommitSha: 'abc123',
    });

    expect(result).toContain('timeline commit: abc123');
  });

  it('renders sourced edges', () => {
    const data: IGraphData = {
      nodes: [
        { id: 'a.ts', label: 'a.ts', color: '#fff' },
        { id: 'b.ts', label: 'b.ts', color: '#fff' },
      ],
      edges: [{ id: 'e1', from: 'a.ts', to: 'b.ts', kind: 'import', sources: [{ id: 'ts:es6', pluginId: 'ts', sourceId: 'es6', label: 'ES6 Import' }] }],
    };
    const plugins: IPluginStatus[] = [{
      id: 'ts', name: 'TypeScript', version: '1.0.0', supportedExtensions: ['.ts'], status: 'active', enabled: true, connectionCount: 1,
      sources: [{ id: 'es6', qualifiedSourceId: 'ts:es6', name: 'ES6 Import', description: '', enabled: true, connectionCount: 1 }],
    }];

    const result = buildMarkdownExport(data, noGroups, plugins);
    expect(result).toContain('## Edges');
    expect(result).toContain('`import` `a.ts` -> `b.ts`');
    expect(result).toContain('ES6 Import (TypeScript)');
  });

  it('renders legend-backed nodes', () => {
    const data: IGraphData = {
      nodes: [
        { id: 'src/App.tsx', label: 'App.tsx', color: '#fff' },
        { id: 'README.md', label: 'README.md', color: '#fff' },
      ],
      edges: [],
    };
    const groups: IGroup[] = [{ id: 'g1', pattern: '*.tsx', color: '#3B82F6' }];

    const result = buildMarkdownExport(data, groups);
    expect(result).toContain('## Legend');
    expect(result).toContain('`*.tsx` (#3B82F6)');
    expect(result).toContain('## Nodes');
    expect(result).toContain('README.md');
  });

  it('renders legend image metadata inline', () => {
    const data: IGraphData = {
      nodes: [{ id: 'src/App.tsx', label: 'App.tsx', color: '#fff' }],
      edges: [],
    };
    const groups: IGroup[] = [{
      id: 'g1', pattern: '*.tsx', color: '#3B82F6', imagePath: '.codegraphy/images/app.png',
    }];

    const result = buildMarkdownExport(data, groups);
    expect(result).toContain('image: .codegraphy/images/app.png');
  });

  it('lists "none" when there is no legend data', () => {
    const data: IGraphData = {
      nodes: [{ id: 'orphan.ts', label: 'orphan.ts', color: '#fff' }],
      edges: [],
    };

    const result = buildMarkdownExport(data, noGroups);
    expect(result).toContain('## Legend');
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
          '> 1 nodes, 0 edges',
          '> timeline commit: abc123',
          '',
          '## Legend',
          '',
          '- `*.tsx` (#3B82F6)',
          '',
          '## Nodes',
          '',
          '- `src/App.tsx` (file) | legend: g1',
          '',
          '## Edges',
          '',
          '- none',
          '',
        ].join('\n'),
        filename: 'codegraphy-graph-2026-03-16T12-34-56.md',
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
