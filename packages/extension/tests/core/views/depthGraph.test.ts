import { describe, it, expect } from 'vitest';
import { depthGraphView } from '../../../src/core/views/depthGraph';
import { IGraphData } from '../../../src/shared/types';
import { IViewContext } from '../../../src/core/views/types';

function createContext(overrides: Partial<IViewContext> = {}): IViewContext {
  return {
    activePlugins: new Set(),
    ...overrides,
  };
}

const linearChain: IGraphData = {
  nodes: [
    { id: 'a', label: 'a', color: '#fff' },
    { id: 'b', label: 'b', color: '#fff' },
    { id: 'c', label: 'c', color: '#fff' },
    { id: 'd', label: 'd', color: '#fff' },
  ],
  edges: [
    { id: 'a->b', from: 'a', to: 'b' },
    { id: 'b->c', from: 'b', to: 'c' },
    { id: 'c->d', from: 'c', to: 'd' },
  ],
};

describe('depthGraphView', () => {
  describe('metadata', () => {
    it('has the correct id', () => {
      expect(depthGraphView.id).toBe('codegraphy.depth-graph');
    });

    it('has the correct name', () => {
      expect(depthGraphView.name).toBe('Depth Graph');
    });

    it('has the correct icon', () => {
      expect(depthGraphView.icon).toBe('target');
    });

    it('has no pluginId', () => {
      expect(depthGraphView.pluginId).toBeUndefined();
    });
  });

  describe('isAvailable', () => {
    it('returns false when no file is focused', () => {
      const context = createContext({ focusedFile: undefined });
      expect(depthGraphView.isAvailable?.(context)).toBe(false);
    });

    it('returns true when a file is focused', () => {
      const context = createContext({ focusedFile: 'a' });
      expect(depthGraphView.isAvailable?.(context)).toBe(true);
    });
  });

  describe('transform — empty and missing cases', () => {
    it('returns empty graph when no file is focused', () => {
      const context = createContext({ focusedFile: undefined });
      const result = depthGraphView.transform(linearChain, context);

      expect(result.nodes).toHaveLength(0);
      expect(result.edges).toHaveLength(0);
    });

    it('returns empty graph when the focused file is not in the graph', () => {
      const context = createContext({ focusedFile: 'nonexistent.ts' });
      const result = depthGraphView.transform(linearChain, context);

      expect(result.nodes).toHaveLength(0);
      expect(result.edges).toHaveLength(0);
    });

    it('returns empty graph when graph has no nodes', () => {
      const emptyGraph: IGraphData = { nodes: [], edges: [] };
      const context = createContext({ focusedFile: 'a' });
      const result = depthGraphView.transform(emptyGraph, context);

      expect(result.nodes).toHaveLength(0);
      expect(result.edges).toHaveLength(0);
    });
  });

  describe('transform — depth limiting', () => {
    it('returns only the focused node when it has no connections', () => {
      const isolated: IGraphData = {
        nodes: [
          { id: 'alone', label: 'alone', color: '#fff' },
          { id: 'other', label: 'other', color: '#fff' },
        ],
        edges: [],
      };
      const context = createContext({ focusedFile: 'alone', depthLimit: 1 });
      const result = depthGraphView.transform(isolated, context);

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].id).toBe('alone');
      expect(result.edges).toHaveLength(0);
    });

    it('defaults to depth 1 when depthLimit is not specified', () => {
      const context = createContext({ focusedFile: 'a' });
      const result = depthGraphView.transform(linearChain, context);

      // a connects to b (1 hop); c and d are beyond depth 1
      const ids = result.nodes.map(n => n.id);
      expect(ids).toContain('a');
      expect(ids).toContain('b');
      expect(ids).not.toContain('c');
      expect(ids).not.toContain('d');
    });

    it('includes nodes exactly at the depth limit', () => {
      const context = createContext({ focusedFile: 'a', depthLimit: 2 });
      const result = depthGraphView.transform(linearChain, context);

      const ids = result.nodes.map(n => n.id);
      expect(ids).toContain('a');
      expect(ids).toContain('b');
      expect(ids).toContain('c');
      expect(ids).not.toContain('d');
    });

    it('includes all nodes when depthLimit covers the full chain', () => {
      const context = createContext({ focusedFile: 'a', depthLimit: 3 });
      const result = depthGraphView.transform(linearChain, context);

      expect(result.nodes).toHaveLength(4);
    });
  });

  describe('transform — depth annotations', () => {
    it('annotates the focused node with depthLevel 0', () => {
      const context = createContext({ focusedFile: 'a', depthLimit: 3 });
      const result = depthGraphView.transform(linearChain, context);

      expect(result.nodes.find(n => n.id === 'a')?.depthLevel).toBe(0);
    });

    it('annotates immediate neighbors with depthLevel 1', () => {
      const context = createContext({ focusedFile: 'a', depthLimit: 3 });
      const result = depthGraphView.transform(linearChain, context);

      expect(result.nodes.find(n => n.id === 'b')?.depthLevel).toBe(1);
    });

    it('annotates 2-hop nodes with depthLevel 2', () => {
      const context = createContext({ focusedFile: 'a', depthLimit: 3 });
      const result = depthGraphView.transform(linearChain, context);

      expect(result.nodes.find(n => n.id === 'c')?.depthLevel).toBe(2);
    });

    it('annotates 3-hop nodes with depthLevel 3', () => {
      const context = createContext({ focusedFile: 'a', depthLimit: 3 });
      const result = depthGraphView.transform(linearChain, context);

      expect(result.nodes.find(n => n.id === 'd')?.depthLevel).toBe(3);
    });
  });

  describe('transform — bidirectional traversal', () => {
    it('traverses both outgoing and incoming edges', () => {
      // b is reachable from a (forward) and c is reachable from b (forward)
      // Starting at b with depth 1 should find both a (backward) and c (forward)
      const context = createContext({ focusedFile: 'b', depthLimit: 1 });
      const result = depthGraphView.transform(linearChain, context);

      const ids = result.nodes.map(n => n.id);
      expect(ids).toContain('a');
      expect(ids).toContain('b');
      expect(ids).toContain('c');
      expect(ids).not.toContain('d');
    });
  });

  describe('transform — edge filtering', () => {
    it('only includes edges where both endpoints are in the result', () => {
      const context = createContext({ focusedFile: 'a', depthLimit: 1 });
      const result = depthGraphView.transform(linearChain, context);

      // Only edge a->b should be included; b->c and c->d are excluded
      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].id).toBe('a->b');
    });
  });
});
