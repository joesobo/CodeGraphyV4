import { describe, expect, it } from 'vitest';
import {
  applySearchAndOrphans,
  deriveScopedGraphQueryData,
  filterEdgesToReportNodes,
} from '../../src/graphQuery/visible';
import type { IGraphData } from '../../src/graph/contracts';

const graphData: IGraphData = {
  nodes: [
    { id: 'src/a.ts', label: 'a.ts', nodeType: 'file' },
    { id: 'src/b.ts', label: 'b.ts', nodeType: 'file' },
    { id: 'src/orphan.ts', label: 'orphan.ts', nodeType: 'file' },
    { id: 'src', label: 'src', nodeType: 'folder' },
  ],
  edges: [
    { id: 'src/a.ts->src/b.ts#import', from: 'src/a.ts', to: 'src/b.ts', kind: 'import', sources: [] },
    { id: 'src/b.ts->src/a.ts#reference', from: 'src/b.ts', to: 'src/a.ts', kind: 'reference', sources: [] },
    { id: 'src->src/a.ts#nests', from: 'src', to: 'src/a.ts', kind: 'nests', sources: [] },
  ],
};

describe('core/graphQuery visible graph helpers', () => {
  it('applies explicit node and edge scope before reports are generated', () => {
    const scoped = deriveScopedGraphQueryData(graphData, {
      scope: {
        nodes: { file: true, folder: false },
        edges: { import: true, reference: false },
      },
    });

    expect(scoped.nodes.map((node) => node.id)).toEqual([
      'src/a.ts',
      'src/b.ts',
      'src/orphan.ts',
    ]);
    expect(scoped.edges.map((edge) => edge.kind)).toEqual(['import']);
  });

  it('keeps enabled non-file node scopes when requested', () => {
    const scoped = deriveScopedGraphQueryData(graphData, {
      scope: {
        nodes: { file: false, folder: true },
        edges: { nests: true },
      },
    });

    expect(scoped.nodes.map((node) => node.id)).toEqual(['src']);
    expect(scoped.edges).toEqual([]);
  });

  it('applies graph search through the visible graph model', () => {
    const visible = applySearchAndOrphans(graphData, { search: 'a.ts' });

    expect(visible.nodes.map((node) => node.id)).toEqual(['src/a.ts']);
    expect(visible.edges).toEqual([]);
  });

  it('removes orphan nodes only when requested', () => {
    const visible = applySearchAndOrphans(graphData, { showOrphans: false });

    expect(visible.nodes.map((node) => node.id)).toEqual([
      'src/a.ts',
      'src/b.ts',
      'src',
    ]);
  });

  it('filters report edges to the current node set', () => {
    expect(filterEdgesToReportNodes(graphData.edges, [graphData.nodes[0], graphData.nodes[1]])).toEqual([
      { id: 'src/a.ts->src/b.ts#import', from: 'src/a.ts', to: 'src/b.ts', kind: 'import', sources: [] },
      { id: 'src/b.ts->src/a.ts#reference', from: 'src/b.ts', to: 'src/a.ts', kind: 'reference', sources: [] },
    ]);
  });
});
