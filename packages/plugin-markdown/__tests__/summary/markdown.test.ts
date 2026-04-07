import { describe, expect, it } from 'vitest';
import type { IGraphData, IGraphEdge } from '@codegraphy-vscode/plugin-api';
import { buildWikilinkSummaryMarkdown } from '../../src/summary/markdown';

describe('buildWikilinkSummaryMarkdown', () => {
  it('summarizes linked and orphan notes without folder nodes', () => {
    const graph: IGraphData = {
      nodes: [
        { id: 'Home.md', label: 'Home.md', color: '#fff' },
        { id: 'Guide.md', label: 'Guide.md', color: '#fff' },
        { id: 'Orphan.md', label: 'Orphan.md', color: '#fff' },
        { id: 'docs', label: 'docs', color: '#888', nodeType: 'folder' },
      ],
      edges: [],
    };
    const referenceEdges: IGraphEdge[] = [
      { id: 'Home.md->Guide.md#reference', from: 'Home.md', to: 'Guide.md', kind: 'reference', sources: [] },
      { id: 'Guide.md->Home.md#reference', from: 'Guide.md', to: 'Home.md', kind: 'reference', sources: [] },
    ];

    const markdown = buildWikilinkSummaryMarkdown(graph, referenceEdges);

    expect(markdown).toContain('# Markdown Wikilink Summary');
    expect(markdown).toContain('- Notes: 3');
    expect(markdown).toContain('- Wikilinks: 2');
    expect(markdown).toContain('- Orphan notes: 1');
    expect(markdown).toContain('`Home.md` (2 wikilinks, 1 neighbors)');
    expect(markdown).toContain('`Guide.md` (2 wikilinks, 1 neighbors)');
    expect(markdown).toContain('`Orphan.md`');
    expect(markdown).not.toContain('`docs`');
  });

  it('renders empty sections when no reference edges exist', () => {
    const graph: IGraphData = {
      nodes: [
        { id: 'Solo.md', label: 'Solo.md', color: '#fff' },
      ],
      edges: [],
    };

    const markdown = buildWikilinkSummaryMarkdown(graph, []);

    expect(markdown).toContain('## Most linked notes');
    expect(markdown).toContain('## Orphan notes');
    expect(markdown).toContain('- None');
    expect(markdown).toContain('`Solo.md`');
  });
});
