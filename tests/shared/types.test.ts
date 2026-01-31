import { describe, it, expect } from 'vitest';
import {
  getFileColor,
  FILE_TYPE_COLORS,
  DEFAULT_NODE_COLOR,
  IGraphNode,
  IGraphEdge,
  IGraphData,
} from '../../src/shared/types';

describe('File Type Colors', () => {
  it('should return correct color for TypeScript files', () => {
    expect(getFileColor('.ts')).toBe('#93C5FD');
  });

  it('should return correct color for TSX files', () => {
    expect(getFileColor('.tsx')).toBe('#67E8F9');
  });

  it('should return correct color for JavaScript files', () => {
    expect(getFileColor('.js')).toBe('#FDE68A');
  });

  it('should return correct color for JSX files', () => {
    expect(getFileColor('.jsx')).toBe('#FDBA74');
  });

  it('should return correct color for CSS files', () => {
    expect(getFileColor('.css')).toBe('#F9A8D4');
  });

  it('should return correct color for JSON files', () => {
    expect(getFileColor('.json')).toBe('#86EFAC');
  });

  it('should return default color for unknown extensions', () => {
    expect(getFileColor('.unknown')).toBe(DEFAULT_NODE_COLOR);
    expect(getFileColor('.xyz')).toBe(DEFAULT_NODE_COLOR);
    expect(getFileColor('')).toBe(DEFAULT_NODE_COLOR);
  });

  it('should be case-insensitive', () => {
    expect(getFileColor('.TS')).toBe('#93C5FD');
    expect(getFileColor('.Tsx')).toBe('#67E8F9');
    expect(getFileColor('.JSON')).toBe('#86EFAC');
  });

  it('should have all expected file type colors defined', () => {
    const expectedExtensions = ['.ts', '.tsx', '.js', '.jsx', '.css', '.scss', '.json', '.md', '.html', '.svg'];
    expectedExtensions.forEach((ext) => {
      expect(FILE_TYPE_COLORS[ext]).toBeDefined();
    });
  });
});

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
      id: 'src/a.ts->src/b.ts',
      from: 'src/a.ts',
      to: 'src/b.ts',
    };
    expect(edge.id).toBe('src/a.ts->src/b.ts');
    expect(edge.from).toBe('src/a.ts');
    expect(edge.to).toBe('src/b.ts');
  });

  it('should allow creating valid IGraphData', () => {
    const graphData: IGraphData = {
      nodes: [
        { id: 'a.ts', label: 'a.ts', color: '#93C5FD' },
        { id: 'b.ts', label: 'b.ts', color: '#93C5FD' },
      ],
      edges: [{ id: 'a.ts->b.ts', from: 'a.ts', to: 'b.ts' }],
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
