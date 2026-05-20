import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, screen, fireEvent, waitFor } from '@testing-library/react';
import Graph from '../../../../src/webview/components/graph/view/component';
import type { IGraphData } from '../../../../src/shared/graph/contracts';
import type { IPluginContextMenuItem } from '../../../../src/shared/plugins/contextMenu';
import { graphStore } from '../../../../src/webview/store/state';
import ForceGraph2D from 'react-force-graph-2d';
import ForceGraph3D from 'react-force-graph-3d';

import { clearSentMessages, findMessage, getSentMessages } from '../../../helpers/sentMessages';

function mockMacPlatform() {
  return vi.spyOn(window.navigator, 'platform', 'get').mockReturnValue('MacIntel');
}

function getGraphContainer(container: HTMLElement): HTMLElement {
  const graphContainer = container.querySelector('[tabindex="0"]');
  expect(graphContainer).toBeTruthy();
  return graphContainer as HTMLElement;
}

async function waitForThreeDimensionalSurface(): Promise<void> {
  await waitFor(() => {
    expect(screen.getByTestId('force-graph-3d')).toBeInTheDocument();
  });
}

async function selectTwoNodesForMultiMenu(graphContainer: HTMLElement): Promise<void> {
  await act(async () => {
    ForceGraph2D.simulateNodeClick({ id: 'nodeA.ts' });
    ForceGraph2D.simulateNodeClick({ id: 'nodeB.ts' }, { button: 0, ctrlKey: true });
  });

  await act(async () => {
    ForceGraph2D.simulateNodeRightClick({ id: 'nodeA.ts' });
    fireEvent.contextMenu(graphContainer, { clientX: 180, clientY: 160 });
  });
}

const menuData: IGraphData = {
  nodes: [
    { id: 'src/app.ts', label: 'app.ts', color: '#93C5FD', x: 12, y: -24 },
    { id: 'src/utils.ts', label: 'utils.ts', color: '#67E8F9', x: 72, y: 36 },
  ],
  edges: [{ id: 'src/app.ts->src/utils.ts', from: 'src/app.ts', to: 'src/utils.ts' , kind: 'import', sources: [] }],
};

const selectionData: IGraphData = {
  nodes: [
    { id: 'nodeA.ts', label: 'nodeA.ts', color: '#93C5FD', x: 10, y: 20 },
    { id: 'nodeB.ts', label: 'nodeB.ts', color: '#67E8F9', x: 40, y: 60 },
  ],
  edges: [],
};

const folderData: IGraphData = {
  nodes: [
    { id: 'src', label: 'src', color: '#94a3b8', nodeType: 'folder' },
    { id: 'src/app.ts', label: 'app.ts', color: '#93C5FD' },
  ],
  edges: [],
};

const symbolData: IGraphData = {
  nodes: [
    { id: 'src/app.ts', label: 'app.ts', color: '#93C5FD', nodeType: 'file' },
    {
      id: 'src/app.ts#start:function',
      label: 'start',
      color: '#8B5CF6',
      nodeType: 'symbol',
      symbol: {
        id: 'src/app.ts#start:function',
        name: 'start',
        kind: 'function',
        filePath: 'src/app.ts',
      },
    },
  ],
  edges: [],
};

describe('Graph context menu (node)', () => {
  const mockFavorites = new Set(['src/app.ts']);

  beforeEach(() => {
    clearSentMessages();
    ForceGraph2D.clearAllHandlers();
    ForceGraph3D.clearAllHandlers();
    graphStore.setState({
      favorites: new Set<string>(),
      graphMode: '2d',
      timelineActive: false,
      pluginContextMenuItems: [],
      graphViewContributionStatuses: [],
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    ForceGraph2D.clearMockPositions();
    graphStore.setState({
      favorites: new Set<string>(),
      graphMode: '2d',
      timelineActive: false,
      pluginContextMenuItems: [],
      graphViewContributionStatuses: [],
    });
  });

  it('opens node menu in 2d from onNodeRightClick alone', async () => {
    render(<Graph data={menuData} />);

    await act(async () => {
      ForceGraph2D.simulateNodeRightClick({ id: 'src/app.ts' });
    });

    await waitFor(() => {
      expect(screen.getByText('Open File')).toBeInTheDocument();
    });
  });

  it('opens node menu in 3d from onNodeRightClick alone', async () => {
    await act(async () => {
      graphStore.setState({ graphMode: '3d' });
    });
    render(<Graph data={menuData} />);
    await waitForThreeDimensionalSurface();

    await act(async () => {
      ForceGraph3D.simulateNodeRightClick({ id: 'src/app.ts' });
    });

    await waitFor(() => {
      expect(screen.getByText('Open File')).toBeInTheDocument();
    });
  });

  it('opens node menu in 2d from mac ctrl+click (same as right-click)', async () => {
    const platformSpy = mockMacPlatform();
    try {
      render(<Graph data={menuData} />);

      await act(async () => {
        ForceGraph2D.simulateNodeClick({ id: 'src/app.ts' }, { button: 0, ctrlKey: true, clientX: 120, clientY: 90 });
      });

      await waitFor(() => {
        expect(screen.getByText('Open File')).toBeInTheDocument();
      });
    } finally {
      platformSpy.mockRestore();
    }
  });

  it('opens node menu in 3d from mac ctrl+click (same as right-click)', async () => {
    const platformSpy = mockMacPlatform();
    try {
      await act(async () => {
        graphStore.setState({ graphMode: '3d' });
      });
      render(<Graph data={menuData} />);
      await waitForThreeDimensionalSurface();

      await act(async () => {
        ForceGraph3D.simulateNodeClick({ id: 'src/app.ts' }, { button: 0, ctrlKey: true, clientX: 130, clientY: 95 });
      });

      await waitFor(() => {
        expect(screen.getByText('Open File')).toBeInTheDocument();
      });
    } finally {
      platformSpy.mockRestore();
    }
  });

  it('shows node menu actions when right-clicking a node', async () => {
    const { container } = render(<Graph data={menuData} />);
    const graphContainer = getGraphContainer(container);

    await act(async () => {
      ForceGraph2D.simulateNodeRightClick({ id: 'src/app.ts' });
      fireEvent.contextMenu(graphContainer, { clientX: 100, clientY: 100 });
    });

    await waitFor(() => {
      expect(screen.getByText('Open File')).toBeInTheDocument();
    });

    expect(screen.getByText('Reveal in Explorer')).toBeInTheDocument();
    expect(screen.getByText('Copy Relative Path')).toBeInTheDocument();
    expect(screen.getByText('Copy Absolute Path')).toBeInTheDocument();
    expect(screen.getByText('Focus Node')).toBeInTheDocument();
    expect(screen.getByText('Add Filter Pattern...')).toBeInTheDocument();
    expect(screen.getByText('Rename...')).toBeInTheDocument();
    expect(screen.getByText('Delete File')).toBeInTheDocument();
    expect(screen.queryByText('New File...')).not.toBeInTheDocument();
    expect(screen.queryByText('Refresh')).not.toBeInTheDocument();
  });

  it('shows Remove from Favorites for favorited nodes', async () => {
    graphStore.setState({ favorites: mockFavorites });
    const { container } = render(<Graph data={menuData} />);
    const graphContainer = getGraphContainer(container);

    await act(async () => {
      ForceGraph2D.simulateNodeRightClick({ id: 'src/app.ts' });
      fireEvent.contextMenu(graphContainer, { clientX: 100, clientY: 100 });
    });

    await waitFor(() => {
      expect(screen.getByText('Remove from Favorites')).toBeInTheDocument();
    });
  });

  it('shows Add to Favorites for non-favorited nodes', async () => {
    graphStore.setState({ favorites: mockFavorites });
    const { container } = render(<Graph data={menuData} />);
    const graphContainer = getGraphContainer(container);

    await act(async () => {
      ForceGraph2D.simulateNodeRightClick({ id: 'src/utils.ts' });
      fireEvent.contextMenu(graphContainer, { clientX: 200, clientY: 200 });
    });

    await waitFor(() => {
      expect(screen.getByText('Add to Favorites')).toBeInTheDocument();
    });
  });

  it('sends OPEN_FILE message when clicking Open File', async () => {
    const { container } = render(<Graph data={menuData} />);
    const graphContainer = getGraphContainer(container);

    await act(async () => {
      ForceGraph2D.simulateNodeRightClick({ id: 'src/app.ts' });
      fireEvent.contextMenu(graphContainer, { clientX: 100, clientY: 100 });
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

  it('sends REVEAL_IN_EXPLORER message when clicking Reveal in Explorer', async () => {
    const { container } = render(<Graph data={menuData} />);
    const graphContainer = getGraphContainer(container);

    await act(async () => {
      ForceGraph2D.simulateNodeRightClick({ id: 'src/app.ts' });
      fireEvent.contextMenu(graphContainer, { clientX: 100, clientY: 100 });
    });

    await waitFor(() => {
      expect(screen.getByText('Reveal in Explorer')).toBeInTheDocument();
    });

    clearSentMessages();
    await act(async () => {
      fireEvent.click(screen.getByText('Reveal in Explorer'));
    });

    const revealMsg = findMessage('REVEAL_IN_EXPLORER');
    expect(revealMsg).toBeTruthy();
    expect(revealMsg!.payload.path).toBe('src/app.ts');
  });

  it('sends COPY_TO_CLIPBOARD relative path when clicking Copy Relative Path', async () => {
    const { container } = render(<Graph data={menuData} />);
    const graphContainer = getGraphContainer(container);

    await act(async () => {
      ForceGraph2D.simulateNodeRightClick({ id: 'src/app.ts' });
      fireEvent.contextMenu(graphContainer, { clientX: 100, clientY: 100 });
    });

    await waitFor(() => {
      expect(screen.getByText('Copy Relative Path')).toBeInTheDocument();
    });

    clearSentMessages();
    await act(async () => {
      fireEvent.click(screen.getByText('Copy Relative Path'));
    });

    const copyMsg = findMessage('COPY_TO_CLIPBOARD');
    expect(copyMsg).toBeTruthy();
    expect(copyMsg!.payload.text).toBe('src/app.ts');
  });

  it('sends COPY_TO_CLIPBOARD absolute path when clicking Copy Absolute Path', async () => {
    const { container } = render(<Graph data={menuData} />);
    const graphContainer = getGraphContainer(container);

    await act(async () => {
      ForceGraph2D.simulateNodeRightClick({ id: 'src/app.ts' });
      fireEvent.contextMenu(graphContainer, { clientX: 100, clientY: 100 });
    });

    await waitFor(() => {
      expect(screen.getByText('Copy Absolute Path')).toBeInTheDocument();
    });

    clearSentMessages();
    await act(async () => {
      fireEvent.click(screen.getByText('Copy Absolute Path'));
    });

    const copyMsg = findMessage('COPY_TO_CLIPBOARD');
    expect(copyMsg).toBeTruthy();
    expect(copyMsg!.payload.text).toBe('absolute:src/app.ts');
  });

  it('focuses node in 2d when clicking Focus Node', async () => {
    const methods = ForceGraph2D.getMockMethods();
    methods.centerAt.mockClear();
    methods.zoom.mockClear();

    const { container } = render(<Graph data={menuData} />);
    const graphContainer = getGraphContainer(container);

    await act(async () => {
      ForceGraph2D.simulateNodeRightClick({ id: 'src/app.ts' });
      fireEvent.contextMenu(graphContainer, { clientX: 100, clientY: 100 });
    });

    await waitFor(() => {
      expect(screen.getByText('Focus Node')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Focus Node'));
    });

    expect(methods.centerAt).toHaveBeenCalledWith(12, -24, 300);
    expect(methods.zoom).toHaveBeenCalledWith(1.5, 300);
  });

  it('focuses node in 3d when clicking Focus Node', async () => {
    const methods = ForceGraph3D.getMockMethods();
    methods.zoomToFit.mockClear();
    graphStore.setState({ graphMode: '3d' });

    const { container } = render(<Graph data={menuData} />);
    const graphContainer = getGraphContainer(container);
    await waitForThreeDimensionalSurface();

    await act(async () => {
      ForceGraph3D.simulateNodeRightClick({ id: 'src/app.ts' });
      fireEvent.contextMenu(graphContainer, { clientX: 100, clientY: 100 });
    });

    await waitFor(() => {
      expect(screen.getByText('Focus Node')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Focus Node'));
    });

    expect(methods.zoomToFit).toHaveBeenCalledWith(300, 20, expect.any(Function));
  });

  it('opens the filter popover request when clicking Add Filter Pattern... for a single node', async () => {
    const onAddFilterRequested = vi.fn();
    const { container } = render(
      <Graph
        data={menuData}
        onAddFilterRequested={onAddFilterRequested}
      />,
    );
    const graphContainer = getGraphContainer(container);

    await act(async () => {
      ForceGraph2D.simulateNodeRightClick({ id: 'src/app.ts' });
      fireEvent.contextMenu(graphContainer, { clientX: 100, clientY: 100 });
    });

    await waitFor(() => {
      expect(screen.getByText('Add Filter Pattern...')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Add Filter Pattern...'));
    });

    expect(onAddFilterRequested).toHaveBeenCalledWith(['src/app.ts']);
  });

  it('sends RENAME_FILE message when clicking Rename...', async () => {
    const { container } = render(<Graph data={menuData} />);
    const graphContainer = getGraphContainer(container);

    await act(async () => {
      ForceGraph2D.simulateNodeRightClick({ id: 'src/app.ts' });
      fireEvent.contextMenu(graphContainer, { clientX: 100, clientY: 100 });
    });

    await waitFor(() => {
      expect(screen.getByText('Rename...')).toBeInTheDocument();
    });

    clearSentMessages();
    await act(async () => {
      fireEvent.click(screen.getByText('Rename...'));
    });

    const renameMsg = findMessage('RENAME_FILE');
    expect(renameMsg).toBeTruthy();
    expect(renameMsg!.payload.path).toBe('src/app.ts');
  });

  it('sends TOGGLE_FAVORITE message when clicking favorite action', async () => {
    const { container } = render(<Graph data={menuData} />);
    const graphContainer = getGraphContainer(container);

    await act(async () => {
      ForceGraph2D.simulateNodeRightClick({ id: 'src/app.ts' });
      fireEvent.contextMenu(graphContainer, { clientX: 100, clientY: 100 });
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

  it('shows symbol-specific node menu actions', async () => {
    const { container } = render(<Graph data={symbolData} />);
    const graphContainer = getGraphContainer(container);

    await act(async () => {
      ForceGraph2D.simulateNodeRightClick({ id: 'src/app.ts#start:function' });
      fireEvent.contextMenu(graphContainer, { clientX: 100, clientY: 100 });
    });

    await waitFor(() => {
      expect(screen.getByText('Go to Symbol')).toBeInTheDocument();
    });

    expect(screen.getByText('Reveal File')).toBeInTheDocument();
    expect(screen.getByText('Copy Symbol ID')).toBeInTheDocument();
    expect(screen.getByText('Copy Symbol Name')).toBeInTheDocument();
    expect(screen.getByText('Add to Favorites')).toBeInTheDocument();
    expect(screen.queryByText('Open File')).not.toBeInTheDocument();
    expect(screen.queryByText('Rename...')).not.toBeInTheDocument();
    expect(screen.queryByText('Delete File')).not.toBeInTheDocument();
  });

  it('sends symbol context menu actions with symbol identity and containing file', async () => {
    const { container } = render(<Graph data={symbolData} />);
    const graphContainer = getGraphContainer(container);

    await act(async () => {
      ForceGraph2D.simulateNodeRightClick({ id: 'src/app.ts#start:function' });
      fireEvent.contextMenu(graphContainer, { clientX: 100, clientY: 100 });
    });

    await waitFor(() => {
      expect(screen.getByText('Go to Symbol')).toBeInTheDocument();
    });

    clearSentMessages();
    await act(async () => {
      fireEvent.click(screen.getByText('Go to Symbol'));
    });
    expect(findMessage('OPEN_FILE')?.payload.path).toBe('src/app.ts#start:function');

    await act(async () => {
      ForceGraph2D.simulateNodeRightClick({ id: 'src/app.ts#start:function' });
      fireEvent.contextMenu(graphContainer, { clientX: 100, clientY: 100 });
    });
    await waitFor(() => {
      expect(screen.getByText('Copy Symbol Name')).toBeInTheDocument();
    });
    clearSentMessages();
    await act(async () => {
      fireEvent.click(screen.getByText('Copy Symbol Name'));
    });
    expect(findMessage('COPY_TO_CLIPBOARD')?.payload.text).toBe('start');

    await act(async () => {
      ForceGraph2D.simulateNodeRightClick({ id: 'src/app.ts#start:function' });
      fireEvent.contextMenu(graphContainer, { clientX: 100, clientY: 100 });
    });
    await waitFor(() => {
      expect(screen.getByText('Copy Symbol ID')).toBeInTheDocument();
    });
    clearSentMessages();
    await act(async () => {
      fireEvent.click(screen.getByText('Copy Symbol ID'));
    });
    expect(findMessage('COPY_TO_CLIPBOARD')?.payload.text).toBe('src/app.ts#start:function');

    await act(async () => {
      ForceGraph2D.simulateNodeRightClick({ id: 'src/app.ts#start:function' });
      fireEvent.contextMenu(graphContainer, { clientX: 100, clientY: 100 });
    });
    await waitFor(() => {
      expect(screen.getByText('Add to Favorites')).toBeInTheDocument();
    });
    clearSentMessages();
    await act(async () => {
      fireEvent.click(screen.getByText('Add to Favorites'));
    });
    expect(findMessage('TOGGLE_FAVORITE')?.payload.paths).toEqual(['src/app.ts#start:function']);
  });

  it('sends DELETE_FILES message when clicking Delete File', async () => {
    const { container } = render(<Graph data={menuData} />);
    const graphContainer = getGraphContainer(container);

    await act(async () => {
      ForceGraph2D.simulateNodeRightClick({ id: 'src/app.ts' });
      fireEvent.contextMenu(graphContainer, { clientX: 100, clientY: 100 });
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

  it('shows folder parity actions when right-clicking a folder node', async () => {
    const { container } = render(<Graph data={folderData} />);
    const graphContainer = getGraphContainer(container);

    await act(async () => {
      ForceGraph2D.simulateNodeRightClick({ id: 'src' });
      fireEvent.contextMenu(graphContainer, { clientX: 100, clientY: 100 });
    });

    await waitFor(() => {
      expect(screen.getByText('New Folder...')).toBeInTheDocument();
    });

    expect(screen.getByText('New File...')).toBeInTheDocument();
    expect(screen.getByText('Reveal in Explorer')).toBeInTheDocument();
    expect(screen.getByText('Copy Relative Path')).toBeInTheDocument();
    expect(screen.getByText('Copy Absolute Path')).toBeInTheDocument();
    expect(screen.getByText('Rename Folder...')).toBeInTheDocument();
    expect(screen.getByText('Delete Folder')).toBeInTheDocument();
    expect(screen.queryByText('Open File')).not.toBeInTheDocument();
  });

  it('sends RENAME_FILE message when clicking Rename Folder...', async () => {
    const { container } = render(<Graph data={folderData} />);
    const graphContainer = getGraphContainer(container);

    await act(async () => {
      ForceGraph2D.simulateNodeRightClick({ id: 'src' });
      fireEvent.contextMenu(graphContainer, { clientX: 100, clientY: 100 });
    });

    await waitFor(() => {
      expect(screen.getByText('Rename Folder...')).toBeInTheDocument();
    });

    clearSentMessages();
    await act(async () => {
      fireEvent.click(screen.getByText('Rename Folder...'));
    });

    const renameMsg = findMessage('RENAME_FILE');
    expect(renameMsg).toBeTruthy();
    expect(renameMsg!.payload.path).toBe('src');
  });

  it('sends DELETE_FILES message when clicking Delete Folder', async () => {
    const { container } = render(<Graph data={folderData} />);
    const graphContainer = getGraphContainer(container);

    await act(async () => {
      ForceGraph2D.simulateNodeRightClick({ id: 'src' });
      fireEvent.contextMenu(graphContainer, { clientX: 100, clientY: 100 });
    });

    await waitFor(() => {
      expect(screen.getByText('Delete Folder')).toBeInTheDocument();
    });

    clearSentMessages();
    await act(async () => {
      fireEvent.click(screen.getByText('Delete Folder'));
    });

    const deleteMsg = findMessage('DELETE_FILES');
    expect(deleteMsg).toBeTruthy();
    expect(deleteMsg!.payload.paths).toEqual(['src']);
  });

  it('renders plugin node items and dispatches PLUGIN_CONTEXT_MENU_ACTION', async () => {
    const pluginItem: IPluginContextMenuItem = {
      label: 'Plugin Inspect',
      when: 'node',
      pluginId: 'acme.plugin',
      index: 0,
    };
    graphStore.setState({ pluginContextMenuItems: [pluginItem] });

    const { container } = render(<Graph data={menuData} />);
    const graphContainer = getGraphContainer(container);

    await act(async () => {
      ForceGraph2D.simulateNodeRightClick({ id: 'src/app.ts' });
      fireEvent.contextMenu(graphContainer, { clientX: 100, clientY: 100 });
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

  it('shows node menu for clicked node even if a different node is selected', async () => {
    const { container } = render(<Graph data={selectionData} />);
    const graphContainer = getGraphContainer(container);

    await act(async () => {
      ForceGraph2D.simulateNodeClick({ id: 'nodeA.ts' });
    });

    await act(async () => {
      ForceGraph2D.simulateNodeRightClick({ id: 'nodeB.ts' });
      fireEvent.contextMenu(graphContainer, { clientX: 200, clientY: 200 });
    });

    await waitFor(() => {
      expect(screen.getByText('Open File')).toBeInTheDocument();
    });
  });

  it('shows multi-node actions when opening menu on selected node set', async () => {
    const { container } = render(<Graph data={selectionData} />);
    const graphContainer = getGraphContainer(container);

    await selectTwoNodesForMultiMenu(graphContainer);

    await waitFor(() => {
      expect(screen.getByText('Open 2 Files')).toBeInTheDocument();
    });
    expect(screen.getByText('Copy Relative Paths')).toBeInTheDocument();
    expect(screen.getByText('Add All to Favorites')).toBeInTheDocument();
    expect(screen.getByText('Add Filter Patterns...')).toBeInTheDocument();
    expect(screen.getByText('Delete 2 Files')).toBeInTheDocument();
    expect(screen.queryByText('Reveal in Explorer')).not.toBeInTheDocument();
    expect(screen.queryByText('Rename...')).not.toBeInTheDocument();
  });

  it('sends OPEN_FILE for each selected node when clicking Open N Files', async () => {
    const { container } = render(<Graph data={selectionData} />);
    const graphContainer = getGraphContainer(container);

    await selectTwoNodesForMultiMenu(graphContainer);

    await waitFor(() => {
      expect(screen.getByText('Open 2 Files')).toBeInTheDocument();
    });

    clearSentMessages();
    await act(async () => {
      fireEvent.click(screen.getByText('Open 2 Files'));
    });

    const openMessages = getSentMessages().filter(msg => msg.type === 'OPEN_FILE');
    expect(openMessages).toHaveLength(2);
    expect(openMessages.map(msg => msg.payload.path)).toEqual(['nodeA.ts', 'nodeB.ts']);
  });

  it('sends COPY_TO_CLIPBOARD with all selected paths for Copy Relative Paths', async () => {
    const { container } = render(<Graph data={selectionData} />);
    const graphContainer = getGraphContainer(container);

    await selectTwoNodesForMultiMenu(graphContainer);

    await waitFor(() => {
      expect(screen.getByText('Copy Relative Paths')).toBeInTheDocument();
    });

    clearSentMessages();
    await act(async () => {
      fireEvent.click(screen.getByText('Copy Relative Paths'));
    });

    const copyMsg = findMessage('COPY_TO_CLIPBOARD');
    expect(copyMsg).toBeTruthy();
    expect(copyMsg!.payload.text).toBe('nodeA.ts\nnodeB.ts');
  });

  it('sends TOGGLE_FAVORITE with all selected paths for Add All to Favorites', async () => {
    const { container } = render(<Graph data={selectionData} />);
    const graphContainer = getGraphContainer(container);

    await selectTwoNodesForMultiMenu(graphContainer);

    await waitFor(() => {
      expect(screen.getByText('Add All to Favorites')).toBeInTheDocument();
    });

    clearSentMessages();
    await act(async () => {
      fireEvent.click(screen.getByText('Add All to Favorites'));
    });

    const favMsg = findMessage('TOGGLE_FAVORITE');
    expect(favMsg).toBeTruthy();
    expect(favMsg!.payload.paths).toEqual(['nodeA.ts', 'nodeB.ts']);
  });

  it('opens the filter popover request with all selected paths for Add Filter Patterns...', async () => {
    const onAddFilterRequested = vi.fn();
    const { container } = render(<Graph data={selectionData} onAddFilterRequested={onAddFilterRequested} />);
    const graphContainer = getGraphContainer(container);

    await selectTwoNodesForMultiMenu(graphContainer);

    await waitFor(() => {
      expect(screen.getByText('Add Filter Patterns...')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Add Filter Patterns...'));
    });

    expect(onAddFilterRequested).toHaveBeenCalledWith(['nodeA.ts', 'nodeB.ts']);
  });

  it('sends DELETE_FILES with all selected paths for Delete N Files', async () => {
    const { container } = render(<Graph data={selectionData} />);
    const graphContainer = getGraphContainer(container);

    await selectTwoNodesForMultiMenu(graphContainer);

    await waitFor(() => {
      expect(screen.getByText('Delete 2 Files')).toBeInTheDocument();
    });

    clearSentMessages();
    await act(async () => {
      fireEvent.click(screen.getByText('Delete 2 Files'));
    });

    const deleteMsg = findMessage('DELETE_FILES');
    expect(deleteMsg).toBeTruthy();
    expect(deleteMsg!.payload.paths).toEqual(['nodeA.ts', 'nodeB.ts']);
  });

  it('keeps filter actions but disables file-changing single-node actions in historical timeline snapshots', async () => {
    graphStore.setState({ timelineActive: true });
    const { container } = render(<Graph data={menuData} />);
    const graphContainer = getGraphContainer(container);

    await act(async () => {
      ForceGraph2D.simulateNodeRightClick({ id: 'src/app.ts' });
      fireEvent.contextMenu(graphContainer, { clientX: 100, clientY: 100 });
    });

    await waitFor(() => {
      expect(screen.getByText('Open File')).toBeInTheDocument();
    });
    expect(screen.getByText('Copy Relative Path')).toBeInTheDocument();
    expect(screen.getByText('Copy Absolute Path')).toBeInTheDocument();
    expect(screen.getByText('Focus Node')).toBeInTheDocument();
    expect(screen.queryByText('Reveal in Explorer')).not.toBeInTheDocument();
    expect(screen.getByText('Add Filter Pattern...')).toBeInTheDocument();
    expect(screen.getByText('Add Legend Group...')).toBeInTheDocument();
    expect(screen.getByText('Rename...')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('Delete File')).toHaveAttribute('aria-disabled', 'true');
  });

  it('keeps filter actions but disables file-changing multi-node actions in historical timeline snapshots', async () => {
    graphStore.setState({ timelineActive: true });
    const { container } = render(<Graph data={selectionData} />);
    const graphContainer = getGraphContainer(container);

    await selectTwoNodesForMultiMenu(graphContainer);

    await waitFor(() => {
      expect(screen.getByText('Open 2 Files')).toBeInTheDocument();
    });
    expect(screen.getByText('Copy Relative Paths')).toBeInTheDocument();
    expect(screen.getByText('Add All to Favorites')).toBeInTheDocument();
    expect(screen.getByText('Add Filter Patterns...')).toBeInTheDocument();
    expect(screen.getByText('Delete 2 Files')).toHaveAttribute('aria-disabled', 'true');
  });

  it('keeps plugin node items visible in timeline mode', async () => {
    const pluginItem: IPluginContextMenuItem = {
      label: 'Plugin Timeline Action',
      when: 'node',
      pluginId: 'acme.plugin',
      index: 2,
    };
    graphStore.setState({ timelineActive: true, pluginContextMenuItems: [pluginItem] });

    const { container } = render(<Graph data={menuData} />);
    const graphContainer = getGraphContainer(container);

    await act(async () => {
      ForceGraph2D.simulateNodeRightClick({ id: 'src/app.ts' });
      fireEvent.contextMenu(graphContainer, { clientX: 100, clientY: 100 });
    });

    await waitFor(() => {
      expect(screen.getByText('Plugin Timeline Action')).toBeInTheDocument();
    });
  });

  it('opens context menu and keeps node actions visible after right-click (tooltip regression guard)', async () => {
    const { container } = render(<Graph data={menuData} />);
    const graphContainer = getGraphContainer(container);

    await act(async () => {
      ForceGraph2D.simulateNodeRightClick({ id: 'src/app.ts' });
      fireEvent.contextMenu(graphContainer, { clientX: 100, clientY: 100 });
    });

    await waitFor(() => {
      expect(screen.getByText('Open File')).toBeInTheDocument();
    });
  });
});
