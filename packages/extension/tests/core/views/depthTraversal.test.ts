import { describe, it, expect } from 'vitest';
import { buildAdjacencyList, bfsFromNode } from '../../../src/core/views/depthTraversal';
import { IGraphData } from '../../../src/shared/types';

describe('buildAdjacencyList', () => {
  it('creates an empty set for each node', () => {
    const data: IGraphData = {
      nodes: [
        { id: 'a.ts', label: 'a.ts', color: '#fff' },
        { id: 'b.ts', label: 'b.ts', color: '#fff' },
      ],
      edges: [],
    };

    const adj = buildAdjacencyList(data);

    expect(adj.get('a.ts')!.size).toBe(0);
    expect(adj.get('b.ts')!.size).toBe(0);
  });

  it('adds bidirectional adjacency for each edge', () => {
    const data: IGraphData = {
      nodes: [
        { id: 'a.ts', label: 'a.ts', color: '#fff' },
        { id: 'b.ts', label: 'b.ts', color: '#fff' },
      ],
      edges: [{ id: 'a->b', from: 'a.ts', to: 'b.ts' }],
    };

    const adj = buildAdjacencyList(data);

    expect(adj.get('a.ts')!.has('b.ts')).toBe(true);
    expect(adj.get('b.ts')!.has('a.ts')).toBe(true);
  });

  it('handles edges referencing nodes not in the node list gracefully', () => {
    const data: IGraphData = {
      nodes: [{ id: 'a.ts', label: 'a.ts', color: '#fff' }],
      edges: [{ id: 'a->b', from: 'a.ts', to: 'missing.ts' }],
    };

    const adj = buildAdjacencyList(data);

    // a.ts should still get the neighbor via optional chaining in source
    // missing.ts has no entry since it's not in nodes
    expect(adj.has('missing.ts')).toBe(false);
    expect(adj.get('a.ts')!.has('missing.ts')).toBe(true);
  });

  it('returns an empty map for empty graph data', () => {
    const data: IGraphData = { nodes: [], edges: [] };

    const adj = buildAdjacencyList(data);

    expect(adj.size).toBe(0);
  });

  it('handles multiple edges from same node', () => {
    const data: IGraphData = {
      nodes: [
        { id: 'a.ts', label: 'a.ts', color: '#fff' },
        { id: 'b.ts', label: 'b.ts', color: '#fff' },
        { id: 'c.ts', label: 'c.ts', color: '#fff' },
      ],
      edges: [
        { id: 'a->b', from: 'a.ts', to: 'b.ts' },
        { id: 'a->c', from: 'a.ts', to: 'c.ts' },
      ],
    };

    const adj = buildAdjacencyList(data);

    expect(adj.get('a.ts')!.size).toBe(2);
    expect(adj.get('b.ts')!.has('a.ts')).toBe(true);
    expect(adj.get('c.ts')!.has('a.ts')).toBe(true);
  });
});

describe('bfsFromNode', () => {
  it('returns only the start node at depth 0 when depth limit is 0', () => {
    const adj = new Map<string, Set<string>>();
    adj.set('a', new Set(['b']));
    adj.set('b', new Set(['a']));

    const depths = bfsFromNode('a', 0, adj);

    expect(depths.size).toBe(1);
    expect(depths.get('a')).toBe(0);
  });

  it('returns direct neighbors at depth 1', () => {
    const adj = new Map<string, Set<string>>();
    adj.set('a', new Set(['b', 'c']));
    adj.set('b', new Set(['a']));
    adj.set('c', new Set(['a', 'd']));
    adj.set('d', new Set(['c']));

    const depths = bfsFromNode('a', 1, adj);

    expect(depths.get('a')).toBe(0);
    expect(depths.get('b')).toBe(1);
    expect(depths.get('c')).toBe(1);
    expect(depths.has('d')).toBe(false);
  });

  it('returns an empty map when start node is not in the adjacency list', () => {
    const adj = new Map<string, Set<string>>();
    adj.set('a', new Set());

    const depths = bfsFromNode('nonexistent', 5, adj);

    expect(depths.size).toBe(0);
  });

  it('does not revisit already visited nodes', () => {
    const adj = new Map<string, Set<string>>();
    adj.set('a', new Set(['b']));
    adj.set('b', new Set(['a', 'c']));
    adj.set('c', new Set(['b', 'a']));

    const depths = bfsFromNode('a', 5, adj);

    expect(depths.get('a')).toBe(0);
    expect(depths.get('b')).toBe(1);
    expect(depths.get('c')).toBe(2);
  });

  it('traverses a linear chain correctly', () => {
    const adj = new Map<string, Set<string>>();
    adj.set('a', new Set(['b']));
    adj.set('b', new Set(['a', 'c']));
    adj.set('c', new Set(['b', 'd']));
    adj.set('d', new Set(['c']));

    const depths = bfsFromNode('a', 3, adj);

    expect(depths.get('a')).toBe(0);
    expect(depths.get('b')).toBe(1);
    expect(depths.get('c')).toBe(2);
    expect(depths.get('d')).toBe(3);
  });

  it('respects depth limit and excludes nodes beyond it', () => {
    const adj = new Map<string, Set<string>>();
    adj.set('a', new Set(['b']));
    adj.set('b', new Set(['a', 'c']));
    adj.set('c', new Set(['b', 'd']));
    adj.set('d', new Set(['c']));

    const depths = bfsFromNode('a', 2, adj);

    expect(depths.has('a')).toBe(true);
    expect(depths.has('b')).toBe(true);
    expect(depths.has('c')).toBe(true);
    expect(depths.has('d')).toBe(false);
  });

  it('handles isolated start node with no neighbors', () => {
    const adj = new Map<string, Set<string>>();
    adj.set('isolated', new Set());

    const depths = bfsFromNode('isolated', 5, adj);

    expect(depths.size).toBe(1);
    expect(depths.get('isolated')).toBe(0);
  });

  it('handles node with neighbor not in adjacency list', () => {
    const adj = new Map<string, Set<string>>();
    adj.set('a', new Set(['ghost']));
    // 'ghost' is not in the adjacency list

    const depths = bfsFromNode('a', 1, adj);

    // 'ghost' has no neighbors entry but should still be visited
    expect(depths.get('a')).toBe(0);
    expect(depths.get('ghost')).toBe(1);
  });
});
