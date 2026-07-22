import { describe, expect, it } from 'vitest';
import type { IGraphData, IGraphEdge, IGraphNode } from '../../../src/graph/contracts';
import {
  applyDomainConnectionFilters,
  createVisibleEdgeSet,
  edgeKey,
} from '../../../src/graphQuery/relationships/visibility';

function node(id: string, nodeType = 'file'): IGraphNode {
  return { id, label: id, nodeType };
}

function edge(from: string, to: string, kind: IGraphEdge['kind']): IGraphEdge {
  return { id: `${from}->${to}#${kind}`, from, to, kind, sources: [] };
}

const graphData: IGraphData = {
  nodes: [node('src/a.ts'), node('src/b.ts'), node('src/c.ts'), node('src/orphan.ts')],
  edges: [
    edge('src/a.ts', 'src/b.ts', 'import'),
    edge('src/a.ts', 'src/c.ts', 'reference'),
    edge('src/b.ts', 'src/c.ts', 'type-import'),
  ],
};

describe('core/graphQuery/relationships/visibility', () => {
  it('builds stable edge keys and applies endpoint and type filters', () => {
    expect(edgeKey({ from: 'src/a.ts', to: 'src/b.ts', kind: 'import' })).toBe('src/a.ts\u0000src/b.ts\u0000import');

    expect(applyDomainConnectionFilters(graphData.edges, {
      from: 'src/a.ts',
      to: 'src/b.ts',
      edgeType: 'import',
    })).toEqual([graphData.edges[0]]);
    expect(applyDomainConnectionFilters(graphData.edges, {
      from: 'src/b.ts',
      edgeType: 'import',
    })).toEqual([]);
    expect(applyDomainConnectionFilters(graphData.edges, {
      to: 'src/a.ts',
      edgeType: 'import',
    })).toEqual([]);
    expect(applyDomainConnectionFilters(graphData.edges, { edgeType: 'overrides' })).toEqual([]);
  });

  it('creates visible edge keys after graph scope and search are applied', () => {
    expect(createVisibleEdgeSet({ graphData }, {
      scope: {
        nodes: { file: true },
        edges: { import: true, reference: false },
      },
    })).toEqual(new Set(['src/a.ts\u0000src/b.ts\u0000import']));

    expect(createVisibleEdgeSet({ graphData }, {
      from: 'src/a.ts',
      edgeType: 'reference',
    })).toEqual(new Set(['src/a.ts\u0000src/c.ts\u0000reference']));
  });
});
