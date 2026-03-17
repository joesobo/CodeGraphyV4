import { describe, it, expect } from 'vitest';
import { depthGraphView } from '../../../src/core/views/depthGraph';
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
  describe('view definition properties', () => {
    it('has the correct id', () => {
      expect(depthGraphView.id).toBe('codegraphy.depth-graph');
    });

    it('has a non-empty id', () => {
      expect(depthGraphView.id.length).toBeGreaterThan(0);
    });

    it('has the correct name', () => {
      expect(depthGraphView.name).toBe('Depth Graph');
    });

    it('has a non-empty name', () => {
      expect(depthGraphView.name.length).toBeGreaterThan(0);
    });

    it('has the correct description', () => {
      expect(depthGraphView.description).toBe('Focus on current file and its connections up to N levels deep');
    });

    it('has a non-empty description', () => {
      expect(depthGraphView.description.length).toBeGreaterThan(0);
    });

    it('has the correct icon', () => {
      expect(depthGraphView.icon).toBe('target');
    });

    it('has a non-empty icon', () => {
      expect(depthGraphView.icon.length).toBeGreaterThan(0);
    });

    it('has a transform function', () => {
      expect(typeof depthGraphView.transform).toBe('function');
    });

    it('has an isAvailable function', () => {
      expect(typeof depthGraphView.isAvailable).toBe('function');
    });

    it('exposes all required IView fields', () => {
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

  describe('transform guard - no focused file', () => {
    it('returns empty nodes array when focusedFile is undefined', () => {
      const result = depthGraphView.transform(sampleData, context({ focusedFile: undefined }));
      expect(result.nodes).toEqual([]);
    });

    it('returns empty edges array when focusedFile is undefined', () => {
      const result = depthGraphView.transform(sampleData, context({ focusedFile: undefined }));
      expect(result.edges).toEqual([]);
    });

    it('returns an object with both nodes and edges properties when focusedFile is undefined', () => {
      const result = depthGraphView.transform(sampleData, context({ focusedFile: undefined }));
      expect(result).toHaveProperty('nodes');
      expect(result).toHaveProperty('edges');
    });
  });
});
