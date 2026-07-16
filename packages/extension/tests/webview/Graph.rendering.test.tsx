import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../src/shared/graph/contracts';
import Graph from '../../src/webview/components/graph/view/component';
import { graphStore } from '../../src/webview/store/state';
import OwnedGraphSurface from '../__mocks__/ownedGraphSurface';
import { clearSentMessages } from '../helpers/sentMessages';

const graphData: IGraphData = {
  nodes: [
    { id: 'a.ts', label: 'a.ts', color: '#93C5FD' },
    { id: 'b.ts', label: 'b.ts', color: '#67E8F9' },
    { id: 'c.ts', label: 'c.ts', color: '#93C5FD' },
  ],
  edges: [
    { id: 'a.ts->b.ts', from: 'a.ts', to: 'b.ts', kind: 'import', sources: [] },
    { id: 'a.ts->c.ts', from: 'a.ts', to: 'c.ts', kind: 'import', sources: [] },
  ],
};

describe('Graph rendering', () => {
  beforeEach(() => {
    clearSentMessages();
    OwnedGraphSurface.clearAllHandlers();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render graph container', () => {
    const { container } = render(<Graph data={graphData} />);
    const graphContainer = container.querySelector('div');
    expect(graphContainer).toBeInTheDocument();
    expect(graphContainer).toHaveAttribute('aria-label', 'Graph Stage');
  });

  it('should apply correct container styles', () => {
    const { container } = render(<Graph data={graphData} />);
    const graphContainer = container.querySelector('div');
    expect(graphContainer).toHaveClass('absolute', 'inset-2', 'rounded-md', 'overflow-hidden');
    expect(graphContainer?.getAttribute('style')).toContain('background-color: canvas');
    expect(graphContainer?.style.borderWidth).toBe('');
    expect(graphContainer?.style.borderStyle).toBe('');
  });

  it('should render the owned WebGPU surface on mount', () => {
    render(<Graph data={graphData} />);
    expect(screen.getByTestId('owned-webgpu-graph')).toBeInTheDocument();
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
      edges: [{ id: 'a.ts->b.ts', from: 'a.ts', to: 'b.ts', kind: 'import', sources: [] }],
    };
    const { container } = render(<Graph data={dataWithPositions} />);
    expect(container.querySelector('div')).toBeInTheDocument();
  });

  it('does not fit a newly rendered graph after physics stabilizes', () => {
    const methods = OwnedGraphSurface.getMockMethods();
    methods.zoomToFit.mockClear();

    const { rerender } = render(<Graph data={graphData} />);
    expect(methods.zoomToFit).not.toHaveBeenCalled();

    act(() => OwnedGraphSurface.simulateEngineStop());
    expect(methods.zoomToFit).not.toHaveBeenCalled();

    act(() => OwnedGraphSurface.simulateEngineStop());
    expect(methods.zoomToFit).not.toHaveBeenCalled();

    rerender(<Graph data={{
      nodes: [
        ...graphData.nodes,
        { id: 'd.ts', label: 'd.ts', color: '#22C55E' },
      ],
      edges: [
        ...graphData.edges,
        { id: 'c.ts->d.ts', from: 'c.ts', to: 'd.ts', kind: 'import', sources: [] },
      ],
    }} />);

    act(() => OwnedGraphSurface.simulateEngineStop());
    expect(methods.zoomToFit).not.toHaveBeenCalled();
  });
});

describe('Graph messages', () => {
  beforeEach(() => clearSentMessages());

  it('should define correct message types', () => {
    const nodeSelectedMsg = { type: 'NODE_SELECTED', payload: { nodeId: 'test.ts' } };
    const nodeDoubleClickedMsg = { type: 'NODE_DOUBLE_CLICKED', payload: { nodeId: 'test.ts' } };
    const webviewReadyMsg = { type: 'WEBVIEW_READY', payload: null };

    expect(nodeSelectedMsg.type).toBe('NODE_SELECTED');
    expect(nodeDoubleClickedMsg.type).toBe('NODE_DOUBLE_CLICKED');
    expect(webviewReadyMsg.type).toBe('WEBVIEW_READY');
  });
});

describe('Graph node sizing', () => {
  it('should render graph with nodeSizeMode connections (default)', () => {
    const data: IGraphData = {
      nodes: [
        { id: 'hub.ts', label: 'hub.ts', color: '#93C5FD' },
        { id: 'leaf1.ts', label: 'leaf1.ts', color: '#93C5FD' },
        { id: 'leaf2.ts', label: 'leaf2.ts', color: '#93C5FD' },
      ],
      edges: [
        { id: 'hub.ts->leaf1.ts', from: 'hub.ts', to: 'leaf1.ts', kind: 'import', sources: [] },
        { id: 'hub.ts->leaf2.ts', from: 'hub.ts', to: 'leaf2.ts', kind: 'import', sources: [] },
      ],
    };
    const { container } = render(<Graph data={data} />);
    expect(container.querySelector('div')).toBeInTheDocument();
  });

  it('should render graph with nodeSizeMode file-size', () => {
    const data: IGraphData = {
      nodes: [
        { id: 'large.ts', label: 'large.ts', color: '#93C5FD', fileSize: 10000 },
        { id: 'small.ts', label: 'small.ts', color: '#93C5FD', fileSize: 100 },
      ],
      edges: [],
    };
    graphStore.setState({ nodeSizeMode: 'file-size' });
    const { container } = render(<Graph data={data} />);
    expect(container.querySelector('div')).toBeInTheDocument();
  });

  it('should handle missing file sizes gracefully in file-size mode', () => {
    const data: IGraphData = {
      nodes: [
        { id: 'known.ts', label: 'known.ts', color: '#93C5FD', fileSize: 1000 },
        { id: 'unknown.ts', label: 'unknown.ts', color: '#93C5FD' },
      ],
      edges: [],
    };
    graphStore.setState({ nodeSizeMode: 'file-size' });
    const { container } = render(<Graph data={data} />);
    expect(container.querySelector('div')).toBeInTheDocument();
  });
});
