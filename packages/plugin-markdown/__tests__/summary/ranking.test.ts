import { describe, expect, it } from 'vitest';
import type { IGraphData, IGraphNode } from '@codegraphy-vscode/plugin-api';
import { getMarkdownNotes, getOrphanNotes, getTopLinkedNotes, rankNotes } from '../../src/summary/ranking';

describe('summary ranking helpers', () => {
  it('filters out folder nodes before ranking', () => {
    const graph: IGraphData = {
      nodes: [
        { id: 'Home.md', label: 'Home.md', color: '#fff' },
        { id: 'docs', label: 'docs', color: '#888', nodeType: 'folder' },
      ],
      edges: [],
    };

    expect(getMarkdownNotes(graph)).toEqual([
      { id: 'Home.md', label: 'Home.md', color: '#fff' },
    ]);
  });

  it('sorts by link count then label and derives top/orphan groups', () => {
    const nodes: IGraphNode[] = [
      { id: 'Zeta.md', label: 'Zeta.md', color: '#fff' },
      { id: 'Alpha.md', label: 'Alpha.md', color: '#fff' },
      { id: 'Orphan.md', label: 'Orphan.md', color: '#fff' },
    ];
    const linkCounts = new Map([
      ['Zeta.md', 2],
      ['Alpha.md', 2],
      ['Orphan.md', 0],
    ]);
    const linkedNodeIds = new Set(['Zeta.md', 'Alpha.md']);

    const ranked = rankNotes(nodes, linkCounts, linkedNodeIds);

    expect(ranked.map(entry => entry.node.label)).toEqual(['Alpha.md', 'Zeta.md', 'Orphan.md']);
    expect(getTopLinkedNotes(ranked).map(entry => entry.node.label)).toEqual(['Alpha.md', 'Zeta.md']);
    expect(getOrphanNotes(ranked).map(entry => entry.node.label)).toEqual(['Orphan.md']);
  });

  it('prefers higher link counts before lower ones', () => {
    const nodes: IGraphNode[] = [
      { id: 'Alpha.md', label: 'Alpha.md', color: '#fff' },
      { id: 'Zulu.md', label: 'Zulu.md', color: '#fff' },
    ];
    const linkCounts = new Map([
      ['Alpha.md', 1],
      ['Zulu.md', 3],
    ]);
    const linkedNodeIds = new Set(['Alpha.md', 'Zulu.md']);

    const ranked = rankNotes(nodes, linkCounts, linkedNodeIds);

    expect(ranked.map(entry => entry.node.label)).toEqual(['Zulu.md', 'Alpha.md']);
  });

  it('prefers linked notes over unlinked notes when link counts tie', () => {
    const nodes: IGraphNode[] = [
      { id: 'Zulu.md', label: 'Zulu.md', color: '#fff' },
      { id: 'Alpha.md', label: 'Alpha.md', color: '#fff' },
    ];
    const linkCounts = new Map([
      ['Zulu.md', 1],
      ['Alpha.md', 1],
    ]);
    const linkedNodeIds = new Set(['Zulu.md']);

    const ranked = rankNotes(nodes, linkCounts, linkedNodeIds);

    expect(ranked.map(entry => ({
      label: entry.node.label,
      neighbors: entry.neighborCount,
    }))).toEqual([
      { label: 'Zulu.md', neighbors: 1 },
      { label: 'Alpha.md', neighbors: 0 },
    ]);
  });

  it('limits top linked notes to the first ten entries', () => {
    const ranked = Array.from({ length: 12 }, (_, index) => ({
      node: { id: `Note-${index}.md`, label: `Note-${index}.md`, color: '#fff' },
      linkCount: 12 - index,
      neighborCount: 1,
    }));

    const top = getTopLinkedNotes(ranked);

    expect(top).toHaveLength(10);
    expect(top.map(entry => entry.node.label)).toEqual([
      'Note-0.md',
      'Note-1.md',
      'Note-2.md',
      'Note-3.md',
      'Note-4.md',
      'Note-5.md',
      'Note-6.md',
      'Note-7.md',
      'Note-8.md',
      'Note-9.md',
    ]);
  });
});
