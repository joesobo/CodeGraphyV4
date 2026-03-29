import { describe, expect, it } from 'vitest';
import { createTestAPI } from './codeGraphyApi.test-utils';

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
});
