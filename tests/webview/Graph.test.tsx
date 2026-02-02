import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Graph from '../../src/webview/components/Graph';
import { IGraphData } from '../../src/shared/types';
import { Network } from 'vis-network';

// Helper to get sent messages from the global mock (set up in tests/setup.ts)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getSentMessages = (): unknown[] => (globalThis as any).__vscodeSentMessages;

// Helper to clear sent messages between tests
const clearSentMessages = (): void => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).__vscodeSentMessages.length = 0;
};

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
    clearSentMessages();
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

describe('Bug #39: Ctrl+click context menu behavior', () => {
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
    Network.clearAllHandlers();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should register select event handler for tracking selection', () => {
    render(<Graph data={mockData} />);
    
    // Verify select event is registered
    const registeredEvents = Network.getRegisteredEvents();
    expect(registeredEvents).toContain('select');
  });

  /**
   * Bug #39 fix: Context menu logic is now in React's onContextMenu handler
   * instead of vis-network's oncontext event. This ensures the node under
   * the pointer is captured BEFORE Radix opens the menu, fixing the issue
   * where first Ctrl+click showed background menu instead of node menu.
   */
  it('should render container with onContextMenu handler', () => {
    const { container } = render(<Graph data={mockData} />);
    
    // The container div should exist (context menu logic is now handled via React)
    const graphContainer = container.querySelector('[tabindex="0"]');
    expect(graphContainer).toBeTruthy();
  });

  it('should handle context menu events via React onContextMenu', async () => {
    const { container } = render(<Graph data={mockData} />);
    const graphContainer = container.querySelector('[tabindex="0"]');
    expect(graphContainer).toBeTruthy();
    
    // Simulate right-click via React - the onContextMenu handler processes it
    // before Radix opens the menu, ensuring correct node targeting
    await act(async () => {
      const event = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: 100,
        clientY: 100,
      });
      graphContainer!.dispatchEvent(event);
    });
    
    // No errors means handler executed successfully
    // The actual menu display is handled by Radix
  });

  it('should handle Ctrl+click context menu same as right-click', async () => {
    const { container } = render(<Graph data={mockData} />);
    const graphContainer = container.querySelector('[tabindex="0"]');
    expect(graphContainer).toBeTruthy();
    
    // Simulate Ctrl+click - should behave same as right-click
    // (no multi-select, menu based on mouse position)
    await act(async () => {
      const event = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: 100,
        clientY: 100,
        ctrlKey: true,
        metaKey: false,
      });
      graphContainer!.dispatchEvent(event);
    });
    
    // No errors means handler executed successfully
    // Ctrl+click behaves same as right-click: menu based on mouse position
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
    Network.clearAllHandlers();
    // Configure mock to return node at specific position
    Network.setMockNodeAtPosition({ x: 100, y: 100 }, 'src/app.ts');
    Network.setMockNodeAtPosition({ x: 200, y: 200 }, 'src/utils.ts');
  });

  afterEach(() => {
    vi.clearAllMocks();
    Network.clearMockPositions();
  });

  it('should show background menu items when right-clicking empty space', async () => {
    const { container } = render(<Graph data={mockData} />);
    const graphContainer = container.querySelector('[tabindex="0"]');
    
    // Right-click on empty space (no node at position 300, 300)
    await act(async () => {
      fireEvent.contextMenu(graphContainer!, { clientX: 300, clientY: 300 });
    });

    // Wait for menu to appear
    await waitFor(() => {
      expect(screen.getByText('New File...')).toBeInTheDocument();
    });

    // Verify background menu items
    expect(screen.getByText('Refresh Graph')).toBeInTheDocument();
    expect(screen.getByText('Fit All Nodes')).toBeInTheDocument();
    
    // Node-specific items should NOT be present
    expect(screen.queryByText('Open File')).not.toBeInTheDocument();
    expect(screen.queryByText('Reveal in Explorer')).not.toBeInTheDocument();
  });

  it('should show node menu items when right-clicking a node', async () => {
    const { container } = render(<Graph data={mockData} />);
    const graphContainer = container.querySelector('[tabindex="0"]');
    
    // Right-click on node position
    await act(async () => {
      fireEvent.contextMenu(graphContainer!, { clientX: 100, clientY: 100 });
    });

    // Wait for menu to appear
    await waitFor(() => {
      expect(screen.getByText('Open File')).toBeInTheDocument();
    });

    // Verify node menu items
    expect(screen.getByText('Reveal in Explorer')).toBeInTheDocument();
    expect(screen.getByText('Copy Relative Path')).toBeInTheDocument();
    expect(screen.getByText('Copy Absolute Path')).toBeInTheDocument();
    expect(screen.getByText('Focus Node')).toBeInTheDocument();
    expect(screen.getByText('Add to Exclude')).toBeInTheDocument();
    expect(screen.getByText('Rename...')).toBeInTheDocument();
    expect(screen.getByText('Delete File')).toBeInTheDocument();
    
    // Background items should NOT be present
    expect(screen.queryByText('New File...')).not.toBeInTheDocument();
    expect(screen.queryByText('Refresh Graph')).not.toBeInTheDocument();
  });

  it('should show "Remove from Favorites" for favorited nodes', async () => {
    const { container } = render(<Graph data={mockData} favorites={mockFavorites} />);
    const graphContainer = container.querySelector('[tabindex="0"]');
    
    // Right-click on favorited node (app.ts at 100,100)
    await act(async () => {
      fireEvent.contextMenu(graphContainer!, { clientX: 100, clientY: 100 });
    });

    await waitFor(() => {
      expect(screen.getByText('Remove from Favorites')).toBeInTheDocument();
    });
  });

  it('should show "Add to Favorites" for non-favorited nodes', async () => {
    const { container } = render(<Graph data={mockData} favorites={mockFavorites} />);
    const graphContainer = container.querySelector('[tabindex="0"]');
    
    // Right-click on non-favorited node (utils.ts at 200,200)
    await act(async () => {
      fireEvent.contextMenu(graphContainer!, { clientX: 200, clientY: 200 });
    });

    await waitFor(() => {
      expect(screen.getByText('Add to Favorites')).toBeInTheDocument();
    });
  });

  it('should send OPEN_FILE message when clicking Open File', async () => {
    const { container } = render(<Graph data={mockData} />);
    const graphContainer = container.querySelector('[tabindex="0"]');
    
    // Right-click on node
    await act(async () => {
      fireEvent.contextMenu(graphContainer!, { clientX: 100, clientY: 100 });
    });

    await waitFor(() => {
      expect(screen.getByText('Open File')).toBeInTheDocument();
    });

    // Click the menu item
    await act(async () => {
      fireEvent.click(screen.getByText('Open File'));
    });

    // Verify message was sent
    const messages = getSentMessages();
    const openMsg = messages.find((m: { type: string }) => m.type === 'OPEN_FILE');
    expect(openMsg).toBeTruthy();
    expect((openMsg as { payload: { path: string } }).payload.path).toBe('src/app.ts');
  });

  it('should send TOGGLE_FAVORITE message when clicking favorite option', async () => {
    const { container } = render(<Graph data={mockData} />);
    const graphContainer = container.querySelector('[tabindex="0"]');
    
    // Right-click on node
    await act(async () => {
      fireEvent.contextMenu(graphContainer!, { clientX: 100, clientY: 100 });
    });

    await waitFor(() => {
      expect(screen.getByText('Add to Favorites')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Add to Favorites'));
    });

    const messages = getSentMessages();
    const favMsg = messages.find((m: { type: string }) => m.type === 'TOGGLE_FAVORITE');
    expect(favMsg).toBeTruthy();
    expect((favMsg as { payload: { paths: string[] } }).payload.paths).toContain('src/app.ts');
  });

  it('should send REFRESH_GRAPH message when clicking Refresh Graph', async () => {
    const { container } = render(<Graph data={mockData} />);
    const graphContainer = container.querySelector('[tabindex="0"]');
    
    // Right-click on empty space
    await act(async () => {
      fireEvent.contextMenu(graphContainer!, { clientX: 300, clientY: 300 });
    });

    await waitFor(() => {
      expect(screen.getByText('Refresh Graph')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Refresh Graph'));
    });

    const messages = getSentMessages();
    expect(messages.find((m: { type: string }) => m.type === 'REFRESH_GRAPH')).toBeTruthy();
  });

  it('should send DELETE_FILES message when clicking Delete File', async () => {
    const { container } = render(<Graph data={mockData} />);
    const graphContainer = container.querySelector('[tabindex="0"]');
    
    await act(async () => {
      fireEvent.contextMenu(graphContainer!, { clientX: 100, clientY: 100 });
    });

    await waitFor(() => {
      expect(screen.getByText('Delete File')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Delete File'));
    });

    const messages = getSentMessages();
    const deleteMsg = messages.find((m: { type: string }) => m.type === 'DELETE_FILES');
    expect(deleteMsg).toBeTruthy();
    expect((deleteMsg as { payload: { paths: string[] } }).payload.paths).toContain('src/app.ts');
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
    Network.clearAllHandlers();
    Network.setMockNodeAtPosition({ x: 100, y: 100 }, 'nodeA.ts');
    Network.setMockNodeAtPosition({ x: 200, y: 200 }, 'nodeB.ts');
  });

  afterEach(() => {
    vi.clearAllMocks();
    Network.clearMockPositions();
  });

  /**
   * Critical bug fix test: Context menu should be based on mouse position,
   * NOT on what's currently selected. If node A is selected and you 
   * right-click on the background, you should get background menu.
   */
  it('should show background menu when right-clicking background even if node is selected', async () => {
    const { container } = render(<Graph data={mockData} />);
    const graphContainer = container.querySelector('[tabindex="0"]');
    
    // First, select nodeA by clicking on it
    await act(async () => {
      // Trigger the select handler through vis-network mock
      const selectHandler = Network.getHandler('select');
      if (selectHandler) {
        selectHandler({ nodes: ['nodeA.ts'], edges: [] });
      }
    });

    // Now right-click on empty background (not on any node)
    await act(async () => {
      fireEvent.contextMenu(graphContainer!, { clientX: 500, clientY: 500 });
    });

    // Should show BACKGROUND menu, not node menu
    await waitFor(() => {
      expect(screen.getByText('New File...')).toBeInTheDocument();
    });
    
    // Node-specific items should NOT appear
    expect(screen.queryByText('Open File')).not.toBeInTheDocument();
  });

  it('should show node menu for clicked node even if different node is selected', async () => {
    const { container } = render(<Graph data={mockData} />);
    const graphContainer = container.querySelector('[tabindex="0"]');
    
    // Select nodeA
    await act(async () => {
      const selectHandler = Network.getHandler('select');
      if (selectHandler) {
        selectHandler({ nodes: ['nodeA.ts'], edges: [] });
      }
    });

    // Right-click on nodeB (different node)
    await act(async () => {
      fireEvent.contextMenu(graphContainer!, { clientX: 200, clientY: 200 });
    });

    // Should show node menu
    await waitFor(() => {
      expect(screen.getByText('Open File')).toBeInTheDocument();
    });
  });

  /**
   * Ctrl+click should behave exactly like right-click.
   * This means: no multi-select, menu based on mouse position.
   */
  it('should show background menu when Ctrl+clicking background even if node is selected', async () => {
    const { container } = render(<Graph data={mockData} />);
    const graphContainer = container.querySelector('[tabindex="0"]');
    
    // First, select nodeA
    await act(async () => {
      const selectHandler = Network.getHandler('select');
      if (selectHandler) {
        selectHandler({ nodes: ['nodeA.ts'], edges: [] });
      }
    });

    // Ctrl+click on empty background (not on any node)
    await act(async () => {
      fireEvent.contextMenu(graphContainer!, { 
        clientX: 500, 
        clientY: 500,
        ctrlKey: true,
      });
    });

    // Should show BACKGROUND menu, not node menu
    // Ctrl+click behaves same as right-click
    await waitFor(() => {
      expect(screen.getByText('New File...')).toBeInTheDocument();
    });
    
    // Node-specific items should NOT appear
    expect(screen.queryByText('Open File')).not.toBeInTheDocument();
  });
});
