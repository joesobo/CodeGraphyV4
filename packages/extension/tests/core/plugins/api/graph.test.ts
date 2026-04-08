import { describe, expect, it } from 'vitest';
import { createTestAPI } from './testSupport';

describe('CodeGraphyAPIImpl graph queries', () => {
  it('returns the graph from the provider', () => {
    const { api, graphData } = createTestAPI();

    const result = api.getGraph();

    expect(result).toEqual(graphData);
    expect(result.nodes).toHaveLength(3);
    expect(result.edges).toHaveLength(2);
  });

  it('finds nodes by id and returns null when missing', () => {
    const { api } = createTestAPI();

    expect(api.getNode('b.ts')).toEqual({ id: 'b.ts', label: 'b.ts', color: '#fff' });
    expect(api.getNode('nonexistent.ts')).toBeNull();
  });

  it('returns neighboring nodes for connected graph nodes', () => {
    const { api } = createTestAPI();

    const neighbors = api.getNeighbors('b.ts');

    expect(neighbors).toHaveLength(2);
    expect(neighbors.map((node) => node.id).sort()).toEqual(['a.ts', 'c.ts']);
  });

  it('returns no neighbors for isolated nodes', () => {
    const { api, graphProvider } = createTestAPI();
    graphProvider.mockReturnValue({
      nodes: [{ id: 'x.ts', label: 'x.ts', color: '#fff' }],
      edges: [],
    });

    expect(api.getNeighbors('x.ts')).toEqual([]);
  });

  it('returns connected edges for a node and empty edges for isolated nodes', () => {
    const { api, graphProvider } = createTestAPI();

    expect(api.getEdgesFor('b.ts')).toHaveLength(2);
    expect(api.getEdgesFor('b.ts').map((edge) => edge.id).sort()).toEqual(['a.ts->b.ts', 'b.ts->c.ts']);

    graphProvider.mockReturnValue({
      nodes: [{ id: 'x.ts', label: 'x.ts', color: '#fff' }],
      edges: [],
    });

    expect(api.getEdgesFor('x.ts')).toEqual([]);
  });

  it('returns incoming and outgoing edges separately', () => {
    const { api } = createTestAPI();

    expect(api.getIncomingEdges('b.ts').map((edge) => edge.id)).toEqual(['a.ts->b.ts']);
    expect(api.getOutgoingEdges('b.ts').map((edge) => edge.id)).toEqual(['b.ts->c.ts']);
  });

  it('filters edges by kind', () => {
    const { api, graphProvider, graphData } = createTestAPI();
    graphProvider.mockReturnValue({
      ...graphData,
      edges: [
        ...graphData.edges,
        { id: 'c.ts->a.ts', from: 'c.ts', to: 'a.ts', kind: 'reference', sources: [] },
      ],
    });

    expect(api.filterEdgesByKind('reference').map((edge) => edge.id)).toEqual(['c.ts->a.ts']);
    expect(api.filterEdgesByKind(['import', 'reference'])).toHaveLength(3);
  });

  it('builds an induced subgraph around a node for the requested hop depth', () => {
    const { api, graphProvider, graphData } = createTestAPI();
    graphProvider.mockReturnValue({
      ...graphData,
      nodes: [
        ...graphData.nodes,
        { id: 'd.ts', label: 'd.ts', color: '#fff' },
      ],
      edges: [
        ...graphData.edges,
        { id: 'c.ts->d.ts', from: 'c.ts', to: 'd.ts', kind: 'reference', sources: [] },
      ],
    });

    expect(api.getSubgraph('b.ts', 1).nodes.map((node) => node.id)).toEqual(['a.ts', 'b.ts', 'c.ts']);
    expect(api.getSubgraph('b.ts', 2).nodes.map((node) => node.id)).toEqual(['a.ts', 'b.ts', 'c.ts', 'd.ts']);
  });

  it('finds the shortest directed path between two nodes', () => {
    const { api, graphProvider, graphData } = createTestAPI();
    graphProvider.mockReturnValue({
      ...graphData,
      nodes: [
        ...graphData.nodes,
        { id: 'd.ts', label: 'd.ts', color: '#fff' },
      ],
      edges: [
        ...graphData.edges,
        { id: 'a.ts->d.ts', from: 'a.ts', to: 'd.ts', kind: 'reference', sources: [] },
        { id: 'd.ts->c.ts', from: 'd.ts', to: 'c.ts', kind: 'reference', sources: [] },
      ],
    });

    expect(api.findPath('a.ts', 'c.ts')?.map((node) => node.id)).toEqual(['a.ts', 'b.ts', 'c.ts']);
    expect(api.findPath('c.ts', 'a.ts')).toBeNull();
  });
});
