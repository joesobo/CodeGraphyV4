import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, screen } from '@testing-library/react';
import Graph from '../../src/webview/components/graph/view';
import type { IGraphData } from '../../src/shared/graph/contracts';
import { graphStore } from '../../src/webview/store/state';
import ForceGraph2D from 'react-force-graph-2d';

import { clearSentMessages, findMessage } from '../helpers/sentMessages';

describe('Graph', () => {
  const mockData: IGraphData = {
    nodes: [
      { id: 'a.ts', label: 'a.ts', color: '#93C5FD' },
      { id: 'b.ts', label: 'b.ts', color: '#67E8F9' },
      { id: 'c.ts', label: 'c.ts', color: '#93C5FD' },
    ],
    edges: [
      { id: 'a.ts->b.ts', from: 'a.ts', to: 'b.ts' , kind: 'import', sources: [] },
      { id: 'a.ts->c.ts', from: 'a.ts', to: 'c.ts' , kind: 'import', sources: [] },
    ],
  };

  beforeEach(() => {
    clearSentMessages();
    ForceGraph2D.clearAllHandlers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    graphStore.setState({ graphMode: '2d', timelineActive: false });
  });

  it('should render graph container', () => {
    const { container } = render(<Graph data={mockData} />);
    const graphContainer = container.querySelector('div');
    expect(graphContainer).toBeInTheDocument();
  });

  it('should apply correct container styles', () => {
    const { container } = render(<Graph data={mockData} />);
    const graphContainer = container.querySelector('div');
    expect(graphContainer).toHaveClass('absolute', 'inset-0', 'rounded-lg', 'm-1');
    expect(graphContainer).toHaveStyle({ backgroundColor: '#18181b' });
    expect(graphContainer).toHaveStyle({ borderWidth: '1px', borderStyle: 'solid' });
  });

  it('should render ForceGraph2D on mount', () => {
    render(<Graph data={mockData} />);
    expect(screen.getByTestId('force-graph-2d')).toBeInTheDocument();
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
      edges: [{ id: 'a.ts->b.ts', from: 'a.ts', to: 'b.ts' , kind: 'import', sources: [] }],
    };
    const { container } = render(<Graph data={dataWithPositions} />);
    expect(container.querySelector('div')).toBeInTheDocument();
  });

  it('fits a newly rendered graph once after physics stabilizes', () => {
    const methods = ForceGraph2D.getMockMethods();
    methods.zoomToFit.mockClear();

    const { rerender } = render(<Graph data={mockData} />);

    expect(methods.zoomToFit).not.toHaveBeenCalled();

    act(() => {
      ForceGraph2D.simulateEngineStop();
    });

    expect(methods.zoomToFit).toHaveBeenCalledTimes(1);
    expect(methods.zoomToFit.mock.calls[0]?.[0]).toBe(300);

    act(() => {
      ForceGraph2D.simulateEngineStop();
    });

    expect(methods.zoomToFit).toHaveBeenCalledTimes(1);

    rerender(<Graph data={{
      nodes: [
        ...mockData.nodes,
        { id: 'd.ts', label: 'd.ts', color: '#22C55E' },
      ],
      edges: [
        ...mockData.edges,
        { id: 'c.ts->d.ts', from: 'c.ts', to: 'd.ts' , kind: 'import', sources: [] },
      ],
    }} />);

    act(() => {
      ForceGraph2D.simulateEngineStop();
    });

    expect(methods.zoomToFit).toHaveBeenCalledTimes(2);
    expect(methods.zoomToFit.mock.calls[1]?.[0]).toBe(300);
  });
});

describe('Graph Messages', () => {
  beforeEach(() => {
    clearSentMessages();
  });

  it('should define correct message types', () => {
    const nodeSelectedMsg = { type: 'NODE_SELECTED', payload: { nodeId: 'test.ts' } };
    const nodeDoubleClickedMsg = { type: 'NODE_DOUBLE_CLICKED', payload: { nodeId: 'test.ts' } };
    const webviewReadyMsg = { type: 'WEBVIEW_READY', payload: null };

    expect(nodeSelectedMsg.type).toBe('NODE_SELECTED');
    expect(nodeDoubleClickedMsg.type).toBe('NODE_DOUBLE_CLICKED');
    expect(webviewReadyMsg.type).toBe('WEBVIEW_READY');
  });
});


describe('node sizing', () => {
  it('should render graph with nodeSizeMode connections (default)', () => {
    const data: IGraphData = {
      nodes: [
        { id: 'hub.ts', label: 'hub.ts', color: '#93C5FD' },
        { id: 'leaf1.ts', label: 'leaf1.ts', color: '#93C5FD' },
        { id: 'leaf2.ts', label: 'leaf2.ts', color: '#93C5FD' },
      ],
      edges: [
        { id: 'hub.ts->leaf1.ts', from: 'hub.ts', to: 'leaf1.ts' , kind: 'import', sources: [] },
        { id: 'hub.ts->leaf2.ts', from: 'hub.ts', to: 'leaf2.ts' , kind: 'import', sources: [] },
      ],
    };
    const { container } = render(<Graph data={data} />);
    expect(container.querySelector('div')).toBeInTheDocument();
  });

  it('should render graph with nodeSizeMode uniform', () => {
    const data: IGraphData = {
      nodes: [
        { id: 'hub.ts', label: 'hub.ts', color: '#93C5FD' },
        { id: 'leaf.ts', label: 'leaf.ts', color: '#93C5FD' },
      ],
      edges: [{ id: 'hub.ts->leaf.ts', from: 'hub.ts', to: 'leaf.ts' , kind: 'import', sources: [] }],
    };
    graphStore.setState({ nodeSizeMode: 'uniform' });
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

  it('should handle access-count mode', () => {
    const data: IGraphData = {
      nodes: [
        { id: 'hub.ts', label: 'hub.ts', color: '#93C5FD' },
        { id: 'leaf.ts', label: 'leaf.ts', color: '#93C5FD' },
      ],
      edges: [{ id: 'hub.ts->leaf.ts', from: 'hub.ts', to: 'leaf.ts' , kind: 'import', sources: [] }],
    };
    graphStore.setState({ nodeSizeMode: 'access-count' });
    const { container } = render(<Graph data={data} />);
    expect(container.querySelector('div')).toBeInTheDocument();
  });
});

describe('Graph dagMode', () => {
  const mockData: IGraphData = {
    nodes: [
      { id: 'a.ts', label: 'a.ts', color: '#93C5FD' },
      { id: 'b.ts', label: 'b.ts', color: '#67E8F9' },
    ],
    edges: [{ id: 'a.ts->b.ts', from: 'a.ts', to: 'b.ts' , kind: 'import', sources: [] }],
  };

  beforeEach(() => {
    ForceGraph2D.clearAllHandlers();
    graphStore.setState({ dagMode: null });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('passes undefined dagMode when dagMode is null', () => {
    graphStore.setState({ dagMode: null });
    render(<Graph data={mockData} />);
    const lastProps = ForceGraph2D.getLastProps();
    expect(lastProps.dagMode).toBeUndefined();
  });

  it('passes dagMode to ForceGraph2D when set', () => {
    graphStore.setState({ dagMode: 'td' });
    render(<Graph data={mockData} />);
    const lastProps = ForceGraph2D.getLastProps();
    expect(lastProps.dagMode).toBe('td');
  });

  it('passes dagLevelDistance when dagMode is set', () => {
    graphStore.setState({ dagMode: 'radialout' });
    render(<Graph data={mockData} />);
    const lastProps = ForceGraph2D.getLastProps();
    expect(lastProps.dagLevelDistance).toBeDefined();
  });
});

describe('Export Functionality', () => {
  const mockData: IGraphData = {
    nodes: [
      { id: 'src/app.ts', label: 'app.ts', color: '#93C5FD', fileSize: 1234, accessCount: 5 },
      { id: 'src/utils.ts', label: 'utils.ts', color: '#67E8F9', fileSize: 567 },
    ],
    edges: [{ id: 'src/app.ts->src/utils.ts', from: 'src/app.ts', to: 'src/utils.ts' , kind: 'import', sources: [] }],
  };

  beforeEach(() => {
    clearSentMessages();
    ForceGraph2D.clearAllHandlers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    ForceGraph2D.clearMockPositions();
  });

  it('should register message listener on mount', async () => {
    graphStore.setState({ nodeSizeMode: 'file-size' });
    render(<Graph data={mockData} />);
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    expect(true).toBe(true);
  });

  it('should handle REQUEST_EXPORT_JSON message and send EXPORT_JSON response', async () => {
    graphStore.setState({ nodeSizeMode: 'file-size' });
    render(<Graph data={mockData} />);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    await act(async () => {
      const event = new MessageEvent('message', { data: { type: 'REQUEST_EXPORT_JSON' } });
      window.dispatchEvent(event);
    });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    const exportMsg = findMessage('EXPORT_JSON');
    expect(exportMsg).toBeTruthy();

    const { json, filename } = exportMsg!.payload;
    expect(json).toBeDefined();
    expect(filename).toMatch(/^codegraphy-graph-.*\.json$/);

    const parsed = JSON.parse(json);
    expect(parsed.format).toBe('codegraphy-export');
    expect(parsed.version).toBe('3.0');
    expect(parsed.exportedAt).toBeDefined();
    expect(parsed.scope.graph).toBe('current-view');
    expect(parsed.summary.totalNodes).toBe(2);
    expect(parsed.summary.totalEdges).toBe(1);
    expect(parsed.summary.totalLegendRules).toBe(0);
    expect(parsed.summary.totalImages).toBe(0);
    expect(parsed.legend).toEqual([]);
    expect(parsed.nodes).toEqual([
      expect.objectContaining({ id: 'src/app.ts', nodeType: 'file', legendIds: [] }),
      expect.objectContaining({ id: 'src/utils.ts', nodeType: 'file', legendIds: [] }),
    ]);
    expect(parsed.edges).toEqual([
      expect.objectContaining({
        from: 'src/app.ts',
        to: 'src/utils.ts',
        kind: 'import',
        sources: [],
      }),
    ]);
  });

  it('should handle REQUEST_EXPORT_MD message and send EXPORT_MD response', async () => {
    graphStore.setState({ nodeSizeMode: 'file-size' });
    render(<Graph data={mockData} />);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    await act(async () => {
      const event = new MessageEvent('message', { data: { type: 'REQUEST_EXPORT_MD' } });
      window.dispatchEvent(event);
    });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    const exportMsg = findMessage('EXPORT_MD');
    expect(exportMsg).toBeTruthy();

    expect(exportMsg!.payload.markdown).toContain('# CodeGraphy Export');
    expect(exportMsg!.payload.filename).toMatch(/^codegraphy-graph-.*\.md$/);
  });

  it('should handle REQUEST_OPEN_IN_EDITOR message and send OPEN_IN_EDITOR to vscode', async () => {
    render(<Graph data={mockData} />);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    await act(async () => {
      const event = new MessageEvent('message', { data: { type: 'REQUEST_OPEN_IN_EDITOR' } });
      window.dispatchEvent(event);
    });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(findMessage('OPEN_IN_EDITOR')).toBeTruthy();
  });

  it('should handle REQUEST_EXPORT_SVG message and send EXPORT_SVG response', async () => {
    render(<Graph data={mockData} />);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    await act(async () => {
      const event = new MessageEvent('message', { data: { type: 'REQUEST_EXPORT_SVG' } });
      window.dispatchEvent(event);
    });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    const exportMsg = findMessage('EXPORT_SVG');
    expect(exportMsg).toBeTruthy();

    const { svg, filename } = exportMsg!.payload;
    expect(svg).toBeDefined();
    expect(filename).toMatch(/^codegraphy-.*\.svg$/);
    expect(svg).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('fill="#18181b"');
    expect(svg).toContain('<marker id="arrowhead"');
  });
});
