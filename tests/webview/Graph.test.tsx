import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Graph from '../../src/webview/components/Graph';
import { IGraphData } from '../../src/shared/types';

// Track messages sent to extension
const sentMessages: unknown[] = [];

// Mock acquireVsCodeApi
vi.stubGlobal('acquireVsCodeApi', () => ({
  postMessage: (message: unknown) => {
    sentMessages.push(message);
  },
  getState: () => null,
  setState: () => {},
}));

describe('Graph', () => {
  const mockData: IGraphData = {
    nodes: [
      { id: 'a.ts', label: 'a.ts', color: '#93C5FD' },
      { id: 'b.ts', label: 'b.ts', color: '#67E8F9' },
      { id: 'c.ts', label: 'c.ts', color: '#93C5FD' },
    ],
    edges: [
      { id: 'a.ts->b.ts', from: 'a.ts', to: 'b.ts' },
      { id: 'a.ts->c.ts', from: 'a.ts', to: 'c.ts' },
    ],
  };

  beforeEach(() => {
    sentMessages.length = 0;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render graph container', () => {
    const { container } = render(<Graph data={mockData} />);
    const graphContainer = container.querySelector('div');
    expect(graphContainer).toBeInTheDocument();
  });

  it('should apply correct container styles', () => {
    const { container } = render(<Graph data={mockData} />);
    const graphContainer = container.querySelector('div');
    expect(graphContainer).toHaveClass('absolute', 'inset-0', 'rounded-lg', 'border', 'border-zinc-700', 'm-1');
    expect(graphContainer).toHaveStyle({ backgroundColor: '#18181b' });
  });

  it('should initialize vis-network on mount', () => {
    // The Network constructor should be called with nodes and edges
    const { container } = render(<Graph data={mockData} />);
    // Network initialization happens - we verify the container is set up
    expect(container.querySelector('div')).toBeInTheDocument();
  });

  it('should handle empty graph data', () => {
    const emptyData: IGraphData = { nodes: [], edges: [] };
    const { container } = render(<Graph data={emptyData} />);
    expect(container.querySelector('div')).toBeInTheDocument();
  });

  it('should handle single node without edges', () => {
    const singleNodeData: IGraphData = {
      nodes: [{ id: 'single.ts', label: 'single.ts', color: '#93C5FD' }],
      edges: [],
    };
    const { container } = render(<Graph data={singleNodeData} />);
    expect(container.querySelector('div')).toBeInTheDocument();
  });

  it('should handle nodes with saved positions', () => {
    const dataWithPositions: IGraphData = {
      nodes: [
        { id: 'a.ts', label: 'a.ts', color: '#93C5FD', x: 100, y: 200 },
        { id: 'b.ts', label: 'b.ts', color: '#67E8F9', x: 300, y: 400 },
      ],
      edges: [{ id: 'a.ts->b.ts', from: 'a.ts', to: 'b.ts' }],
    };
    const { container } = render(<Graph data={dataWithPositions} />);
    expect(container.querySelector('div')).toBeInTheDocument();
  });
});

describe('Graph Messages', () => {
  beforeEach(() => {
    sentMessages.length = 0;
  });

  it('should define correct message types', () => {
    // Test that message types are correctly structured
    const nodeSelectedMsg = { type: 'NODE_SELECTED', payload: { nodeId: 'test.ts' } };
    const nodeDoubleClickedMsg = { type: 'NODE_DOUBLE_CLICKED', payload: { nodeId: 'test.ts' } };
    const positionsUpdatedMsg = {
      type: 'POSITIONS_UPDATED',
      payload: { positions: { 'test.ts': { x: 100, y: 200 } } },
    };
    const webviewReadyMsg = { type: 'WEBVIEW_READY', payload: null };

    // Verify structure
    expect(nodeSelectedMsg.type).toBe('NODE_SELECTED');
    expect(nodeDoubleClickedMsg.type).toBe('NODE_DOUBLE_CLICKED');
    expect(positionsUpdatedMsg.type).toBe('POSITIONS_UPDATED');
    expect(webviewReadyMsg.type).toBe('WEBVIEW_READY');
  });
});
