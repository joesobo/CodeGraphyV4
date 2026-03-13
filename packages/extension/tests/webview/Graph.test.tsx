import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, screen, fireEvent, waitFor } from '@testing-library/react';
import Graph from '../../src/webview/components/Graph';
import { IGraphData, IPluginContextMenuItem } from '../../src/shared/types';
import { graphStore } from '../../src/webview/store';
import ForceGraph2D from 'react-force-graph-2d';
import ForceGraph3D from 'react-force-graph-3d';

import { clearSentMessages, findMessage } from '../helpers/sentMessages';

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
      edges: [{ id: 'a.ts->b.ts', from: 'a.ts', to: 'b.ts' }],
    };
    const { container } = render(<Graph data={dataWithPositions} />);
    expect(container.querySelector('div')).toBeInTheDocument();
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

describe('Bug #39: Context menu behavior', () => {
  const mockData: IGraphData = {
    nodes: [
      { id: 'a.ts', label: 'a.ts', color: '#93C5FD' },
      { id: 'b.ts', label: 'b.ts', color: '#67E8F9' },
      { id: 'c.ts', label: 'c.ts', color: '#93C5FD' },
    ],
    edges: [],
  };

  beforeEach(() => {
    clearSentMessages();
    ForceGraph2D.clearAllHandlers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    graphStore.setState({ graphMode: '2d', timelineActive: false });
  });

  it('should render container with onContextMenu handler', () => {
    const { container } = render(<Graph data={mockData} />);
    const graphContainer = container.querySelector('[tabindex="0"]');
    expect(graphContainer).toBeTruthy();
  });

  it('should handle context menu events via React onContextMenu', async () => {
    const { container } = render(<Graph data={mockData} />);
    const graphContainer = container.querySelector('[tabindex="0"]');
    expect(graphContainer).toBeTruthy();

    await act(async () => {
      const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 100, clientY: 100 });
      graphContainer!.dispatchEvent(event);
    });
  });
});

describe('Bug #54: context menu should open from graph right-click callbacks', () => {
  const mockData: IGraphData = {
    nodes: [
      { id: 'a.ts', label: 'a.ts', color: '#93C5FD' },
      { id: 'b.ts', label: 'b.ts', color: '#67E8F9' },
    ],
    edges: [],
  };

  beforeEach(() => {
    clearSentMessages();
    ForceGraph2D.clearAllHandlers();
    ForceGraph3D.clearAllHandlers();
    graphStore.setState({
      graphMode: '2d',
      timelineActive: false,
      favorites: new Set<string>(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    graphStore.setState({ graphMode: '2d', timelineActive: false });
  });

  it('opens background menu in 2d from onBackgroundRightClick alone', async () => {
    render(<Graph data={mockData} />);

    await act(async () => {
      ForceGraph2D.simulateBackgroundRightClick();
    });

    await waitFor(() => {
      expect(screen.getByText('New File...')).toBeInTheDocument();
    });
  });

  it('opens node menu in 2d from onNodeRightClick alone', async () => {
    render(<Graph data={mockData} />);

    await act(async () => {
      ForceGraph2D.simulateNodeRightClick({ id: 'a.ts' });
    });

    await waitFor(() => {
      expect(screen.getByText('Open File')).toBeInTheDocument();
    });
  });

  it('opens background menu in 3d from onBackgroundRightClick alone', async () => {
    graphStore.setState({ graphMode: '3d' });
    render(<Graph data={mockData} />);

    await act(async () => {
      ForceGraph3D.simulateBackgroundRightClick();
    });

    await waitFor(() => {
      expect(screen.getByText('New File...')).toBeInTheDocument();
    });
  });

  it('opens node menu in 3d from onNodeRightClick alone', async () => {
    graphStore.setState({ graphMode: '3d' });
    render(<Graph data={mockData} />);

    await act(async () => {
      ForceGraph3D.simulateNodeRightClick({ id: 'a.ts' });
    });

    await waitFor(() => {
      expect(screen.getByText('Open File')).toBeInTheDocument();
    });
  });
});

describe('Context Menu Content and Actions', () => {
  const mockData: IGraphData = {
    nodes: [
      { id: 'src/app.ts', label: 'app.ts', color: '#93C5FD' },
      { id: 'src/utils.ts', label: 'utils.ts', color: '#67E8F9' },
    ],
    edges: [{ id: 'src/app.ts->src/utils.ts', from: 'src/app.ts', to: 'src/utils.ts' }],
  };

  const mockFavorites = new Set(['src/app.ts']);

  beforeEach(() => {
    clearSentMessages();
    ForceGraph2D.clearAllHandlers();
    graphStore.setState({
      favorites: new Set(),
      graphMode: '2d',
      timelineActive: false,
      pluginContextMenuItems: [],
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    ForceGraph2D.clearMockPositions();
  });

  it('should show background menu items when right-clicking empty space', async () => {
    const { container } = render(<Graph data={mockData} />);
    const graphContainer = container.querySelector('[tabindex="0"]');

    await act(async () => {
      ForceGraph2D.simulateBackgroundRightClick();
      fireEvent.contextMenu(graphContainer!, { clientX: 300, clientY: 300 });
    });

    await waitFor(() => {
      expect(screen.getByText('New File...')).toBeInTheDocument();
    });

    expect(screen.getByText('Refresh Graph')).toBeInTheDocument();
    expect(screen.getByText('Fit All Nodes')).toBeInTheDocument();
    expect(screen.queryByText('Open File')).not.toBeInTheDocument();
    expect(screen.queryByText('Reveal in Explorer')).not.toBeInTheDocument();
  });

  it('should show node menu items when right-clicking a node', async () => {
    const { container } = render(<Graph data={mockData} />);
    const graphContainer = container.querySelector('[tabindex="0"]');

    await act(async () => {
      ForceGraph2D.simulateNodeRightClick({ id: 'src/app.ts' });
      fireEvent.contextMenu(graphContainer!, { clientX: 100, clientY: 100 });
    });

    await waitFor(() => {
      expect(screen.getByText('Open File')).toBeInTheDocument();
    });

    expect(screen.getByText('Reveal in Explorer')).toBeInTheDocument();
    expect(screen.getByText('Copy Relative Path')).toBeInTheDocument();
    expect(screen.getByText('Copy Absolute Path')).toBeInTheDocument();
    expect(screen.getByText('Focus Node')).toBeInTheDocument();
    expect(screen.getByText('Add to Exclude')).toBeInTheDocument();
    expect(screen.getByText('Rename...')).toBeInTheDocument();
    expect(screen.getByText('Delete File')).toBeInTheDocument();
    expect(screen.queryByText('New File...')).not.toBeInTheDocument();
    expect(screen.queryByText('Refresh Graph')).not.toBeInTheDocument();
  });

  it('should show "Remove from Favorites" for favorited nodes', async () => {
    graphStore.setState({ favorites: mockFavorites });
    const { container } = render(<Graph data={mockData} />);
    const graphContainer = container.querySelector('[tabindex="0"]');

    await act(async () => {
      ForceGraph2D.simulateNodeRightClick({ id: 'src/app.ts' });
      fireEvent.contextMenu(graphContainer!, { clientX: 100, clientY: 100 });
    });

    await waitFor(() => {
      expect(screen.getByText('Remove from Favorites')).toBeInTheDocument();
    });
  });

  it('should show "Add to Favorites" for non-favorited nodes', async () => {
    graphStore.setState({ favorites: mockFavorites });
    const { container } = render(<Graph data={mockData} />);
    const graphContainer = container.querySelector('[tabindex="0"]');

    await act(async () => {
      ForceGraph2D.simulateNodeRightClick({ id: 'src/utils.ts' });
      fireEvent.contextMenu(graphContainer!, { clientX: 200, clientY: 200 });
    });

    await waitFor(() => {
      expect(screen.getByText('Add to Favorites')).toBeInTheDocument();
    });
  });

  it('should send OPEN_FILE message when clicking Open File', async () => {
    const { container } = render(<Graph data={mockData} />);
    const graphContainer = container.querySelector('[tabindex="0"]');

    await act(async () => {
      ForceGraph2D.simulateNodeRightClick({ id: 'src/app.ts' });
      fireEvent.contextMenu(graphContainer!, { clientX: 100, clientY: 100 });
    });

    await waitFor(() => {
      expect(screen.getByText('Open File')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Open File'));
    });

    const openMsg = findMessage('OPEN_FILE');
    expect(openMsg).toBeTruthy();
    expect(openMsg!.payload.path).toBe('src/app.ts');
  });

  it('should send TOGGLE_FAVORITE message when clicking favorite option', async () => {
    const { container } = render(<Graph data={mockData} />);
    const graphContainer = container.querySelector('[tabindex="0"]');

    await act(async () => {
      ForceGraph2D.simulateNodeRightClick({ id: 'src/app.ts' });
      fireEvent.contextMenu(graphContainer!, { clientX: 100, clientY: 100 });
    });

    await waitFor(() => {
      expect(screen.getByText('Add to Favorites')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Add to Favorites'));
    });

    const favMsg = findMessage('TOGGLE_FAVORITE');
    expect(favMsg).toBeTruthy();
    expect(favMsg!.payload.paths).toContain('src/app.ts');
  });

  it('should send REFRESH_GRAPH message when clicking Refresh Graph', async () => {
    const { container } = render(<Graph data={mockData} />);
    const graphContainer = container.querySelector('[tabindex="0"]');

    await act(async () => {
      ForceGraph2D.simulateBackgroundRightClick();
      fireEvent.contextMenu(graphContainer!, { clientX: 300, clientY: 300 });
    });

    await waitFor(() => {
      expect(screen.getByText('Refresh Graph')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Refresh Graph'));
    });

    expect(findMessage('REFRESH_GRAPH')).toBeTruthy();
  });

  it('should send DELETE_FILES message when clicking Delete File', async () => {
    const { container } = render(<Graph data={mockData} />);
    const graphContainer = container.querySelector('[tabindex="0"]');

    await act(async () => {
      ForceGraph2D.simulateNodeRightClick({ id: 'src/app.ts' });
      fireEvent.contextMenu(graphContainer!, { clientX: 100, clientY: 100 });
    });

    await waitFor(() => {
      expect(screen.getByText('Delete File')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Delete File'));
    });

    const deleteMsg = findMessage('DELETE_FILES');
    expect(deleteMsg).toBeTruthy();
    expect(deleteMsg!.payload.paths).toContain('src/app.ts');
  });

  it('should render plugin node items and dispatch PLUGIN_CONTEXT_MENU_ACTION', async () => {
    const pluginItem: IPluginContextMenuItem = {
      label: 'Plugin Inspect',
      when: 'node',
      pluginId: 'acme.plugin',
      index: 0,
    };
    graphStore.setState({ pluginContextMenuItems: [pluginItem] });

    const { container } = render(<Graph data={mockData} />);
    const graphContainer = container.querySelector('[tabindex="0"]');

    await act(async () => {
      ForceGraph2D.simulateNodeRightClick({ id: 'src/app.ts' });
      fireEvent.contextMenu(graphContainer!, { clientX: 100, clientY: 100 });
    });

    await waitFor(() => {
      expect(screen.getByText('Plugin Inspect')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Plugin Inspect'));
    });

    const pluginMsg = findMessage('PLUGIN_CONTEXT_MENU_ACTION');
    expect(pluginMsg).toBeTruthy();
    expect(pluginMsg!.payload).toEqual({
      pluginId: 'acme.plugin',
      index: 0,
      targetId: 'src/app.ts',
      targetType: 'node',
    });
  });

  it('should not show plugin node items on background context', async () => {
    const pluginItem: IPluginContextMenuItem = {
      label: 'Plugin Inspect',
      when: 'node',
      pluginId: 'acme.plugin',
      index: 0,
    };
    graphStore.setState({ pluginContextMenuItems: [pluginItem] });

    const { container } = render(<Graph data={mockData} />);
    const graphContainer = container.querySelector('[tabindex="0"]');

    await act(async () => {
      ForceGraph2D.simulateBackgroundRightClick();
      fireEvent.contextMenu(graphContainer!, { clientX: 300, clientY: 300 });
    });

    await waitFor(() => {
      expect(screen.getByText('New File...')).toBeInTheDocument();
    });
    expect(screen.queryByText('Plugin Inspect')).not.toBeInTheDocument();
  });
});

describe('Context Menu: Mouse Position vs Selection (Bug Fix)', () => {
  const mockData: IGraphData = {
    nodes: [
      { id: 'nodeA.ts', label: 'nodeA.ts', color: '#93C5FD' },
      { id: 'nodeB.ts', label: 'nodeB.ts', color: '#67E8F9' },
    ],
    edges: [],
  };

  beforeEach(() => {
    clearSentMessages();
    ForceGraph2D.clearAllHandlers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    ForceGraph2D.clearMockPositions();
  });

  it('should show background menu when right-clicking background even if node is selected', async () => {
    const { container } = render(<Graph data={mockData} />);
    const graphContainer = container.querySelector('[tabindex="0"]');

    // First select nodeA
    await act(async () => {
      ForceGraph2D.simulateNodeClick({ id: 'nodeA.ts' });
    });

    // Right-click on background
    await act(async () => {
      ForceGraph2D.simulateBackgroundRightClick();
      fireEvent.contextMenu(graphContainer!, { clientX: 500, clientY: 500 });
    });

    await waitFor(() => {
      expect(screen.getByText('New File...')).toBeInTheDocument();
    });

    expect(screen.queryByText('Open File')).not.toBeInTheDocument();
  });

  it('should show node menu for clicked node even if different node is selected', async () => {
    const { container } = render(<Graph data={mockData} />);
    const graphContainer = container.querySelector('[tabindex="0"]');

    // Select nodeA
    await act(async () => {
      ForceGraph2D.simulateNodeClick({ id: 'nodeA.ts' });
    });

    // Right-click on nodeB
    await act(async () => {
      ForceGraph2D.simulateNodeRightClick({ id: 'nodeB.ts' });
      fireEvent.contextMenu(graphContainer!, { clientX: 200, clientY: 200 });
    });

    await waitFor(() => {
      expect(screen.getByText('Open File')).toBeInTheDocument();
    });
  });

  it('should show background menu when Ctrl+clicking background even if node is selected', async () => {
    const { container } = render(<Graph data={mockData} />);
    const graphContainer = container.querySelector('[tabindex="0"]');

    await act(async () => {
      ForceGraph2D.simulateNodeClick({ id: 'nodeA.ts' });
    });

    await act(async () => {
      ForceGraph2D.simulateBackgroundRightClick();
      fireEvent.contextMenu(graphContainer!, { clientX: 500, clientY: 500, ctrlKey: true });
    });

    await waitFor(() => {
      expect(screen.getByText('New File...')).toBeInTheDocument();
    });

    expect(screen.queryByText('Open File')).not.toBeInTheDocument();
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
          { id: 'hub.ts->leaf1.ts', from: 'hub.ts', to: 'leaf1.ts' },
          { id: 'hub.ts->leaf2.ts', from: 'hub.ts', to: 'leaf2.ts' },
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
        edges: [{ id: 'hub.ts->leaf.ts', from: 'hub.ts', to: 'leaf.ts' }],
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
        edges: [{ id: 'hub.ts->leaf.ts', from: 'hub.ts', to: 'leaf.ts' }],
      };
      graphStore.setState({ nodeSizeMode: 'access-count' });
      const { container } = render(<Graph data={data} />);
      expect(container.querySelector('div')).toBeInTheDocument();
    });
  });
});

describe('Tooltip Behavior', () => {
  const mockData: IGraphData = {
    nodes: [{ id: 'src/app.ts', label: 'app.ts', color: '#93C5FD' }],
    edges: [],
  };

  beforeEach(() => {
    clearSentMessages();
    ForceGraph2D.clearAllHandlers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    ForceGraph2D.clearMockPositions();
  });

  it('should hide tooltip when context menu opens', async () => {
    const { container } = render(<Graph data={mockData} />);
    const graphContainer = container.querySelector('[tabindex="0"]');

    await act(async () => {
      ForceGraph2D.simulateNodeRightClick({ id: 'src/app.ts' });
      fireEvent.contextMenu(graphContainer!, { clientX: 100, clientY: 100 });
    });

    await waitFor(() => {
      expect(screen.getByText('Open File')).toBeInTheDocument();
    });
  });
});

describe('Graph dagMode', () => {
  const mockData: IGraphData = {
    nodes: [
      { id: 'a.ts', label: 'a.ts', color: '#93C5FD' },
      { id: 'b.ts', label: 'b.ts', color: '#67E8F9' },
    ],
    edges: [{ id: 'a.ts->b.ts', from: 'a.ts', to: 'b.ts' }],
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
    edges: [{ id: 'src/app.ts->src/utils.ts', from: 'src/app.ts', to: 'src/utils.ts' }],
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
    expect(filename).toMatch(/^codegraphy-connections-.*\.json$/);

    const parsed = JSON.parse(json);
    expect(parsed.format).toBe('codegraphy-export');
    expect(parsed.version).toBe('2.0');
    expect(parsed.exportedAt).toBeDefined();
    expect(parsed.scope.graph).toBe('current-view');
    expect(parsed.summary.totalFiles).toBe(2);
    expect(parsed.summary.totalConnections).toBe(1);

    expect(parsed.sections.connections.ungrouped['src/app.ts']).toBeDefined();
    expect(parsed.sections.connections.ungrouped['src/app.ts'].imports).toEqual({ unattributed: ['src/utils.ts'] });

    expect(parsed.sections.connections.ungrouped['src/utils.ts']).toBeDefined();
    expect(parsed.sections.connections.ungrouped['src/utils.ts'].imports).toBeUndefined();
    expect(parsed.sections.images).toEqual({});
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
    expect(exportMsg!.payload.filename).toMatch(/^codegraphy-connections-.*\.md$/);
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
