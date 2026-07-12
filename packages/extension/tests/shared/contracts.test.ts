import { describe, it, expect } from 'vitest';
import type { IGraphNode, IGraphEdge, IGraphData } from '../../src/shared/graph/contracts';
import type { IGroup } from '../../src/shared/settings/groups';

describe('Graph Types', () => {
  it('should allow creating valid IGraphNode', () => {
    const node: IGraphNode = {
      id: 'src/test.ts',
      label: 'test.ts',
      color: '#93C5FD',
    };
    expect(node.id).toBe('src/test.ts');
    expect(node.label).toBe('test.ts');
    expect(node.color).toBe('#93C5FD');
  });

  it('should allow optional x and y positions on IGraphNode', () => {
    const nodeWithPosition: IGraphNode = {
      id: 'src/test.ts',
      label: 'test.ts',
      color: '#93C5FD',
      x: 100,
      y: 200,
    };
    expect(nodeWithPosition.x).toBe(100);
    expect(nodeWithPosition.y).toBe(200);

    const nodeWithoutPosition: IGraphNode = {
      id: 'src/test.ts',
      label: 'test.ts',
      color: '#93C5FD',
    };
    expect(nodeWithoutPosition.x).toBeUndefined();
    expect(nodeWithoutPosition.y).toBeUndefined();
  });

  it('should allow creating valid IGraphEdge', () => {
    const edge: IGraphEdge = {
      id: 'src/a.ts->src/b.ts#import',
      from: 'src/a.ts',
      to: 'src/b.ts',
      kind: 'import',
      sources: [],
    };
    expect(edge.id).toBe('src/a.ts->src/b.ts#import');
    expect(edge.from).toBe('src/a.ts');
    expect(edge.to).toBe('src/b.ts');
  });

  it('should allow creating valid IGraphData', () => {
    const graphData: IGraphData = {
      nodes: [
        { id: 'a.ts', label: 'a.ts', color: '#93C5FD' },
        { id: 'b.ts', label: 'b.ts', color: '#93C5FD' },
      ],
      edges: [{ id: 'a.ts->b.ts', from: 'a.ts', to: 'b.ts' , kind: 'import', sources: [] }],
    };
    expect(graphData.nodes).toHaveLength(2);
    expect(graphData.edges).toHaveLength(1);
  });

  it('should allow empty IGraphData', () => {
    const emptyData: IGraphData = {
      nodes: [],
      edges: [],
    };
    expect(emptyData.nodes).toHaveLength(0);
    expect(emptyData.edges).toHaveLength(0);
  });
});

describe('IGroup', () => {
  it('should be a valid interface with required fields', () => {
    const group: IGroup = { id: 'abc', pattern: 'src/**', color: '#3B82F6' };
    expect(group.id).toBe('abc');
    expect(group.pattern).toBe('src/**');
    expect(group.color).toBe('#3B82F6');
  });

});
