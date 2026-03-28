import { describe, it, expect, vi } from 'vitest';
import {
  getGraph,
  getNode,
  getNeighbors,
  getEdgesFor,
} from '../../../src/core/plugins/graphQueryFacade';
import type { IGraphData } from '../../../src/shared/contracts';

const sampleGraph: IGraphData = {
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

describe('graphQueryFacade', () => {
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

      expect(result).toEqual([{ id: 'a->b', from: 'a.ts', to: 'b.ts' }]);
    });

    it('returns edges where the node is the target', () => {
      const getter = vi.fn().mockReturnValue(sampleGraph);

      const result = getEdgesFor('b.ts', getter);

      expect(result.map((e) => e.id)).toContain('a->b');
      expect(result.map((e) => e.id)).toContain('b->c');
    });

    it('returns empty array for a node with no edges', () => {
      const getter = vi.fn().mockReturnValue(sampleGraph);

      expect(getEdgesFor('c.ts', getter)).toEqual([{ id: 'b->c', from: 'b.ts', to: 'c.ts' }]);
    });
  });
});
