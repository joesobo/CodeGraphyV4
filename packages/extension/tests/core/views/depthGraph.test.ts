import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IGraphData } from '../../../src/shared/types';
import { IViewContext } from '../../../src/core/views/types';

const sampleData: IGraphData = {
  nodes: [
    { id: 'a.ts', label: 'a.ts', color: '#93C5FD' },
    { id: 'b.ts', label: 'b.ts', color: '#93C5FD' },
    { id: 'c.ts', label: 'c.ts', color: '#93C5FD' },
    { id: 'd.ts', label: 'd.ts', color: '#93C5FD' },
  ],
  edges: [
    { id: 'a.ts->b.ts', from: 'a.ts', to: 'b.ts' },
    { id: 'b.ts->c.ts', from: 'b.ts', to: 'c.ts' },
    { id: 'c.ts->d.ts', from: 'c.ts', to: 'd.ts' },
  ],
};

function context(overrides: Partial<IViewContext> = {}): IViewContext {
  return { activePlugins: new Set(), ...overrides };
}

describe('depthGraphView', () => {
  describe('view definition properties (fresh import)', () => {
    beforeEach(() => {
      vi.resetModules();
    });

    it('has the correct id', async () => {
      const { depthGraphView } = await import('../../../src/core/views/depthGraph');
      expect(depthGraphView.id).toBe('codegraphy.depth-graph');
    });

    it('has the correct name', async () => {
      const { depthGraphView } = await import('../../../src/core/views/depthGraph');
      expect(depthGraphView.name).toBe('Depth Graph');
    });

    it('has the correct description', async () => {
      const { depthGraphView } = await import('../../../src/core/views/depthGraph');
      expect(depthGraphView.description).toBe('Focus on current file and its connections up to N levels deep');
    });

    it('has the correct icon', async () => {
      const { depthGraphView } = await import('../../../src/core/views/depthGraph');
      expect(depthGraphView.icon).toBe('target');
    });

    it('has a transform function', async () => {
      const { depthGraphView } = await import('../../../src/core/views/depthGraph');
      expect(typeof depthGraphView.transform).toBe('function');
    });

    it('has an isAvailable function', async () => {
      const { depthGraphView } = await import('../../../src/core/views/depthGraph');
      expect(typeof depthGraphView.isAvailable).toBe('function');
    });

    it('exposes all required IView fields', async () => {
      const { depthGraphView } = await import('../../../src/core/views/depthGraph');
      expect(depthGraphView).toEqual(
        expect.objectContaining({
          id: 'codegraphy.depth-graph',
          name: 'Depth Graph',
          icon: 'target',
          description: 'Focus on current file and its connections up to N levels deep',
        }),
      );
    });
  });

  describe('transform behavior', () => {
    let depthGraphView: Awaited<typeof import('../../../src/core/views/depthGraph')>['depthGraphView'];

    beforeEach(async () => {
      vi.resetModules();
      const mod = await import('../../../src/core/views/depthGraph');
      depthGraphView = mod.depthGraphView;
    });

    it('returns an empty graph when no file is focused', () => {
      const result = depthGraphView.transform(sampleData, context());
      expect(result.nodes).toHaveLength(0);
      expect(result.edges).toHaveLength(0);
    });

    it('includes only the focused node at depth 0 when depth limit is 0', () => {
      const result = depthGraphView.transform(sampleData, context({ focusedFile: 'a.ts', depthLimit: 0 }));
      expect(result.nodes.map((n) => n.id)).toEqual(['a.ts']);
      expect(result.edges).toHaveLength(0);
    });

    it('includes the focused node and direct neighbors at depth limit 1', () => {
      const result = depthGraphView.transform(sampleData, context({ focusedFile: 'b.ts', depthLimit: 1 }));
      const ids = result.nodes.map((n) => n.id);
      expect(ids).toContain('b.ts');
      expect(ids).toContain('a.ts');
      expect(ids).toContain('c.ts');
      expect(ids).not.toContain('d.ts');
    });

    it('annotates nodes with their depth level', () => {
      const result = depthGraphView.transform(sampleData, context({ focusedFile: 'a.ts', depthLimit: 1 }));
      const aNode = result.nodes.find((n) => n.id === 'a.ts');
      const bNode = result.nodes.find((n) => n.id === 'b.ts');
      expect(aNode?.depthLevel).toBe(0);
      expect(bNode?.depthLevel).toBe(1);
    });

    it('includes edges only between included nodes', () => {
      const result = depthGraphView.transform(sampleData, context({ focusedFile: 'a.ts', depthLimit: 1 }));
      for (const edge of result.edges) {
        const nodeIds = result.nodes.map((n) => n.id);
        expect(nodeIds).toContain(edge.from);
        expect(nodeIds).toContain(edge.to);
      }
    });

    it('returns an empty graph when focused file is not in the data', () => {
      const result = depthGraphView.transform(sampleData, context({ focusedFile: 'nonexistent.ts', depthLimit: 1 }));
      expect(result.nodes).toHaveLength(0);
    });

    it('is available when a file is focused', () => {
      expect(depthGraphView.isAvailable!(context({ focusedFile: 'a.ts' }))).toBe(true);
    });

    it('is not available when no file is focused', () => {
      expect(depthGraphView.isAvailable!(context())).toBe(false);
    });

    it('returns empty nodes array when focusedFile is undefined', () => {
      const result = depthGraphView.transform(sampleData, context({ focusedFile: undefined }));
      expect(result.nodes).toEqual([]);
    });

    it('returns empty edges array when focusedFile is undefined', () => {
      const result = depthGraphView.transform(sampleData, context({ focusedFile: undefined }));
      expect(result.edges).toEqual([]);
    });
  });
});
