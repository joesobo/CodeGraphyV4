import { describe, it, expect, vi } from 'vitest';
import { getGraph, getNode, getNeighbors, getEdgesFor } from '@/core/plugins/graphQueryFacade';
import { IGraphData } from '@/shared/types';

function buildGraph(): IGraphData {
  return {
    nodes: [
      { id: 'a.ts', label: 'a.ts', color: '#fff' },
      { id: 'b.ts', label: 'b.ts', color: '#fff' },
      { id: 'c.ts', label: 'c.ts', color: '#fff' },
    ],
    edges: [
      { id: 'a->b', from: 'a.ts', to: 'b.ts' },
      { id: 'b->c', from: 'b.ts', to: 'c.ts' },
    ],
  };
}

describe('getGraph', () => {
  it('returns the full graph from the provider', () => {
    const graph = buildGraph();
    const provider = vi.fn(() => graph);

    const result = getGraph(provider);

    expect(result).toBe(graph);
    expect(provider).toHaveBeenCalledOnce();
  });
});

describe('getNode', () => {
  it('returns the node with the matching id', () => {
    const provider = vi.fn(() => buildGraph());

    const result = getNode('b.ts', provider);

    expect(result?.id).toBe('b.ts');
  });

  it('returns null when no node has the given id', () => {
    const provider = vi.fn(() => buildGraph());

    const result = getNode('missing.ts', provider);

    expect(result).toBeNull();
  });
});

describe('getNeighbors', () => {
  it('returns nodes connected to the given node as source', () => {
    const provider = vi.fn(() => buildGraph());

    const result = getNeighbors('a.ts', provider);

    expect(result.map((n) => n.id)).toContain('b.ts');
  });

  it('returns nodes connected to the given node as target', () => {
    const provider = vi.fn(() => buildGraph());

    const result = getNeighbors('b.ts', provider);

    expect(result.map((n) => n.id)).toContain('a.ts');
    expect(result.map((n) => n.id)).toContain('c.ts');
  });

  it('returns an empty array for a node with no edges', () => {
    const provider = vi.fn(() => buildGraph());

    // 'c.ts' is only a target, no outgoing edges from it
    const result = getNeighbors('c.ts', provider);

    expect(result.map((n) => n.id)).toContain('b.ts');
  });

  it('returns an empty array for an unknown node id', () => {
    const provider = vi.fn(() => buildGraph());

    const result = getNeighbors('unknown.ts', provider);

    expect(result).toEqual([]);
  });
});

describe('getEdgesFor', () => {
  it('returns edges where the node is the source', () => {
    const provider = vi.fn(() => buildGraph());

    const result = getEdgesFor('a.ts', provider);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a->b');
  });

  it('returns edges where the node is the target', () => {
    const provider = vi.fn(() => buildGraph());

    const result = getEdgesFor('b.ts', provider);

    const ids = result.map((e) => e.id);
    expect(ids).toContain('a->b');
    expect(ids).toContain('b->c');
  });

  it('returns an empty array for an unknown node id', () => {
    const provider = vi.fn(() => buildGraph());

    const result = getEdgesFor('unknown.ts', provider);

    expect(result).toEqual([]);
  });
});
