import { describe, it, expect, vi } from 'vitest';
import {
  filterEdgesByKind,
  findPath,
  getGraph,
  getIncomingEdges,
  getNode,
  getNeighbors,
  getOutgoingEdges,
  getSubgraph,
  getEdgesFor,
} from '../../../../src/core/plugins/graphQuery/facade';
import {
  filterEdgesByKind as filterEdgesByKindDirect,
  getEdgesFor as getEdgesForDirect,
  getIncomingEdges as getIncomingEdgesDirect,
  getOutgoingEdges as getOutgoingEdgesDirect,
} from '../../../../src/core/plugins/graphQuery/read/edges';
import {
  getGraph as getGraphDirect,
  getNeighbors as getNeighborsDirect,
  getNode as getNodeDirect,
} from '../../../../src/core/plugins/graphQuery/read/nodes';
import {
  findNodePath as findPathDirect,
} from '../../../../src/core/plugins/graphQuery/traversal/path';
import {
  buildSubgraph as getSubgraphDirectFromSubgraph,
} from '../../../../src/core/plugins/graphQuery/traversal/subgraph';
import type { IGraphData } from '../../../../src/shared/graph/contracts';

const sampleGraph: IGraphData = {
  nodes: [
    { id: 'a.ts', label: 'a.ts', color: '#fff' },
    { id: 'b.ts', label: 'b.ts', color: '#fff' },
    { id: 'c.ts', label: 'c.ts', color: '#fff' },
  ],
  edges: [
    { id: 'a->b', from: 'a.ts', to: 'b.ts' , kind: 'import', sources: [] },
    { id: 'b->c', from: 'b.ts', to: 'c.ts' , kind: 'import', sources: [] },
  ],
};

describe('core/plugins/graphQuery/facade', () => {
  it('re-exports the underlying facade helpers', () => {
    expect(getGraph).toBe(getGraphDirect);
    expect(getNode).toBe(getNodeDirect);
    expect(getNeighbors).toBe(getNeighborsDirect);
    expect(getEdgesFor).toBe(getEdgesForDirect);
    expect(getIncomingEdges).toBe(getIncomingEdgesDirect);
    expect(getOutgoingEdges).toBe(getOutgoingEdgesDirect);
    expect(filterEdgesByKind).toBe(filterEdgesByKindDirect);
    expect(getSubgraph).toBe(getSubgraphDirectFromSubgraph);
    expect(findPath).toBe(findPathDirect);
  });

  describe('getGraph', () => {
    it('returns the graph from the getter', () => {
      const getter = vi.fn().mockReturnValue(sampleGraph);

      expect(getGraph(getter)).toBe(sampleGraph);
    });
  });

  describe('getNode', () => {
    it('returns the node with the given id', () => {
      const getter = vi.fn().mockReturnValue(sampleGraph);

      const result = getNode('a.ts', getter);

      expect(result).toEqual({ id: 'a.ts', label: 'a.ts', color: '#fff' });
    });

    it('returns null when the node does not exist', () => {
      const getter = vi.fn().mockReturnValue(sampleGraph);

      expect(getNode('missing.ts', getter)).toBeNull();
    });
  });

  describe('getNeighbors', () => {
    it('returns nodes connected via outgoing edges', () => {
      const getter = vi.fn().mockReturnValue(sampleGraph);

      const result = getNeighbors('a.ts', getter);

      expect(result.map((n) => n.id)).toEqual(['b.ts']);
    });

    it('returns nodes connected via incoming edges', () => {
      const getter = vi.fn().mockReturnValue(sampleGraph);

      const result = getNeighbors('b.ts', getter);

      expect(result.map((n) => n.id)).toContain('a.ts');
      expect(result.map((n) => n.id)).toContain('c.ts');
    });

    it('returns empty array for a node with no connections', () => {
      const isolated: IGraphData = {
        nodes: [{ id: 'alone.ts', label: 'alone', color: '#fff' }],
        edges: [],
      };
      const getter = vi.fn().mockReturnValue(isolated);

      expect(getNeighbors('alone.ts', getter)).toEqual([]);
    });
  });

  describe('getEdgesFor', () => {
    it('returns edges where the node is the source', () => {
      const getter = vi.fn().mockReturnValue(sampleGraph);

      const result = getEdgesFor('a.ts', getter);

      expect(result).toEqual([{ id: 'a->b', from: 'a.ts', to: 'b.ts' , kind: 'import', sources: [] }]);
    });

    it('returns edges where the node is the target', () => {
      const getter = vi.fn().mockReturnValue(sampleGraph);

      const result = getEdgesFor('b.ts', getter);

      expect(result.map((e) => e.id)).toContain('a->b');
      expect(result.map((e) => e.id)).toContain('b->c');
    });

    it('returns empty array for a node with no edges', () => {
      const getter = vi.fn().mockReturnValue(sampleGraph);

      expect(getEdgesFor('c.ts', getter)).toEqual([{ id: 'b->c', from: 'b.ts', to: 'c.ts' , kind: 'import', sources: [] }]);
    });
  });

  describe('getIncomingEdges', () => {
    it('returns only edges where the node is the target', () => {
      const getter = vi.fn().mockReturnValue(sampleGraph);

      expect(getIncomingEdges('b.ts', getter)).toEqual([
        { id: 'a->b', from: 'a.ts', to: 'b.ts' , kind: 'import', sources: [] },
      ]);
    });
  });

  describe('getOutgoingEdges', () => {
    it('returns only edges where the node is the source', () => {
      const getter = vi.fn().mockReturnValue(sampleGraph);

      expect(getOutgoingEdges('b.ts', getter)).toEqual([
        { id: 'b->c', from: 'b.ts', to: 'c.ts' , kind: 'import', sources: [] },
      ]);
    });
  });

  describe('filterEdgesByKind', () => {
    it('returns only edges matching the requested kinds', () => {
      const getter = vi.fn().mockReturnValue({
        nodes: sampleGraph.nodes,
        edges: [
          ...sampleGraph.edges,
          { id: 'c->a', from: 'c.ts', to: 'a.ts', kind: 'reference', sources: [] },
        ],
      } satisfies IGraphData);

      expect(filterEdgesByKind('reference', getter)).toEqual([
        { id: 'c->a', from: 'c.ts', to: 'a.ts', kind: 'reference', sources: [] },
      ]);
      expect(filterEdgesByKind(['import', 'reference'], getter)).toHaveLength(3);
    });
  });

  describe('getSubgraph', () => {
    it('returns an induced subgraph around the seed node for the requested hop depth', () => {
      const getter = vi.fn().mockReturnValue({
        nodes: [
          ...sampleGraph.nodes,
          { id: 'd.ts', label: 'd.ts', color: '#fff' },
        ],
        edges: [
          ...sampleGraph.edges,
          { id: 'c->d', from: 'c.ts', to: 'd.ts', kind: 'reference', sources: [] },
        ],
      } satisfies IGraphData);

      expect(getSubgraph('b.ts', 1, getter)).toEqual({
        nodes: [
          { id: 'a.ts', label: 'a.ts', color: '#fff' },
          { id: 'b.ts', label: 'b.ts', color: '#fff' },
          { id: 'c.ts', label: 'c.ts', color: '#fff' },
        ],
        edges: [
          { id: 'a->b', from: 'a.ts', to: 'b.ts' , kind: 'import', sources: [] },
          { id: 'b->c', from: 'b.ts', to: 'c.ts' , kind: 'import', sources: [] },
        ],
      });
      expect(getSubgraph('b.ts', 2, getter).nodes.map((node) => node.id)).toEqual(['a.ts', 'b.ts', 'c.ts', 'd.ts']);
    });
  });

  describe('findPath', () => {
    it('returns the shortest node path when a route exists', () => {
      const getter = vi.fn().mockReturnValue({
        nodes: [
          ...sampleGraph.nodes,
          { id: 'd.ts', label: 'd.ts', color: '#fff' },
        ],
        edges: [
          ...sampleGraph.edges,
          { id: 'a->d', from: 'a.ts', to: 'd.ts', kind: 'reference', sources: [] },
          { id: 'd->c', from: 'd.ts', to: 'c.ts', kind: 'reference', sources: [] },
        ],
      } satisfies IGraphData);

      expect(findPath('a.ts', 'c.ts', getter)?.map((node) => node.id)).toEqual([
        'a.ts',
        'b.ts',
        'c.ts',
      ]);
    });

    it('returns null when no path exists', () => {
      const getter = vi.fn().mockReturnValue(sampleGraph);

      expect(findPath('c.ts', 'a.ts', getter)).toBeNull();
    });
  });
});
