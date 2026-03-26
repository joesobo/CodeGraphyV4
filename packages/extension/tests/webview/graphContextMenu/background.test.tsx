import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, screen, fireEvent, waitFor } from '@testing-library/react';
import Graph from '../../../src/webview/components/Graph';
import { IGraphData, IPluginContextMenuItem } from '../../../src/shared/contracts';
import { graphStore } from '../../../src/webview/store';
import ForceGraph2D from 'react-force-graph-2d';
import ForceGraph3D from 'react-force-graph-3d';

import { clearSentMessages, findMessage } from '../../helpers/sentMessages';

function mockMacPlatform() {
  return vi.spyOn(window.navigator, 'platform', 'get').mockReturnValue('MacIntel');
}

function getGraphContainer(container: HTMLElement): HTMLElement {
  const graphContainer = container.querySelector('[tabindex="0"]');
  expect(graphContainer).toBeTruthy();
  return graphContainer as HTMLElement;
}

const menuData: IGraphData = {
  nodes: [
    { id: 'src/app.ts', label: 'app.ts', color: '#93C5FD' },
    { id: 'src/utils.ts', label: 'utils.ts', color: '#67E8F9' },
  ],
  edges: [{ id: 'src/app.ts->src/utils.ts', from: 'src/app.ts', to: 'src/utils.ts' }],
};

const selectionData: IGraphData = {
  nodes: [
    { id: 'nodeA.ts', label: 'nodeA.ts', color: '#93C5FD' },
    { id: 'nodeB.ts', label: 'nodeB.ts', color: '#67E8F9' },
  ],
  edges: [],
};

describe('Graph context menu (background)', () => {
  beforeEach(() => {
    clearSentMessages();
    ForceGraph2D.clearAllHandlers();
    ForceGraph3D.clearAllHandlers();
    graphStore.setState({
      favorites: new Set<string>(),
      graphMode: '2d',
      timelineActive: false,
      pluginContextMenuItems: [],
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
    });
  });

  it('renders graph container with context menu trigger target', () => {
    const { container } = render(<Graph data={menuData} />);
    expect(getGraphContainer(container)).toBeInTheDocument();
  });

  it('opens background menu in 2d from onBackgroundRightClick alone', async () => {
    render(<Graph data={menuData} />);

    await act(async () => {
      ForceGraph2D.simulateBackgroundRightClick();
    });

    await waitFor(() => {
      expect(screen.getByText('New File...')).toBeInTheDocument();
    });
  });

  it('opens background menu in 3d from onBackgroundRightClick alone', async () => {
    await act(async () => {
      graphStore.setState({ graphMode: '3d' });
    });
    render(<Graph data={menuData} />);

    await act(async () => {
      ForceGraph3D.simulateBackgroundRightClick();
    });

    await waitFor(() => {
      expect(screen.getByText('New File...')).toBeInTheDocument();
    });
  });

  it('falls back to background menu when only container contextmenu event fires', async () => {
    const { container } = render(<Graph data={menuData} />);
    const graphContainer = getGraphContainer(container);

    await act(async () => {
      fireEvent.contextMenu(graphContainer, { clientX: 300, clientY: 300 });
    });

    await waitFor(() => {
      expect(screen.getByText('New File...')).toBeInTheDocument();
    });
  });

  it('opens background menu from right mouse down/up fallback when callbacks are swallowed', async () => {
    const { container } = render(<Graph data={menuData} />);
    const graphContainer = getGraphContainer(container);

    await act(async () => {
      fireEvent.mouseDown(graphContainer, { button: 2, clientX: 280, clientY: 260 });
      fireEvent.mouseUp(graphContainer, { button: 2, clientX: 280, clientY: 260 });
    });

    await waitFor(() => {
      expect(screen.getByText('New File...')).toBeInTheDocument();
    });
  });

  it('opens background menu in 2d from mac ctrl+click (same as right-click)', async () => {
    const platformSpy = mockMacPlatform();
    try {
      render(<Graph data={menuData} />);

      await act(async () => {
        ForceGraph2D.simulateBackgroundClick({ button: 0, ctrlKey: true, clientX: 300, clientY: 300 });
      });

      await waitFor(() => {
        expect(screen.getByText('New File...')).toBeInTheDocument();
      });
    } finally {
      platformSpy.mockRestore();
    }
  });

  it('opens background menu in 3d from mac ctrl+click (same as right-click)', async () => {
    const platformSpy = mockMacPlatform();
    try {
      await act(async () => {
        graphStore.setState({ graphMode: '3d' });
      });
      render(<Graph data={menuData} />);

      await act(async () => {
        ForceGraph3D.simulateBackgroundClick({ button: 0, ctrlKey: true, clientX: 320, clientY: 320 });
      });

      await waitFor(() => {
        expect(screen.getByText('New File...')).toBeInTheDocument();
      });
    } finally {
      platformSpy.mockRestore();
    }
  });

  it('shows background context actions when right-clicking empty space', async () => {
    const { container } = render(<Graph data={menuData} />);
    const graphContainer = getGraphContainer(container);

    await act(async () => {
      ForceGraph2D.simulateBackgroundRightClick();
      fireEvent.contextMenu(graphContainer, { clientX: 300, clientY: 300 });
    });

    await waitFor(() => {
      expect(screen.getByText('New File...')).toBeInTheDocument();
    });

    expect(screen.getByText('Refresh Graph')).toBeInTheDocument();
    expect(screen.getByText('Fit All Nodes')).toBeInTheDocument();
    expect(screen.queryByText('Open File')).not.toBeInTheDocument();
    expect(screen.queryByText('Reveal in Explorer')).not.toBeInTheDocument();
  });

  it('hides New File... in timeline mode on background context', async () => {
    graphStore.setState({ timelineActive: true });
    const { container } = render(<Graph data={menuData} />);
    const graphContainer = getGraphContainer(container);

    await act(async () => {
      ForceGraph2D.simulateBackgroundRightClick();
      fireEvent.contextMenu(graphContainer, { clientX: 320, clientY: 300 });
    });

    await waitFor(() => {
      expect(screen.getByText('Refresh Graph')).toBeInTheDocument();
    });
    expect(screen.getByText('Fit All Nodes')).toBeInTheDocument();
    expect(screen.queryByText('New File...')).not.toBeInTheDocument();
  });

  it('sends REFRESH_GRAPH message when clicking Refresh Graph', async () => {
    const { container } = render(<Graph data={menuData} />);
    const graphContainer = getGraphContainer(container);

    await act(async () => {
      ForceGraph2D.simulateBackgroundRightClick();
      fireEvent.contextMenu(graphContainer, { clientX: 300, clientY: 300 });
    });

    await waitFor(() => {
      expect(screen.getByText('Refresh Graph')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Refresh Graph'));
    });

    expect(findMessage('REFRESH_GRAPH')).toBeTruthy();
  });

  it('sends CREATE_FILE message when clicking New File...', async () => {
    const { container } = render(<Graph data={menuData} />);
    const graphContainer = getGraphContainer(container);

    await act(async () => {
      ForceGraph2D.simulateBackgroundRightClick();
      fireEvent.contextMenu(graphContainer, { clientX: 300, clientY: 300 });
    });

    await waitFor(() => {
      expect(screen.getByText('New File...')).toBeInTheDocument();
    });

    clearSentMessages();
    await act(async () => {
      fireEvent.click(screen.getByText('New File...'));
    });

    const createMsg = findMessage('CREATE_FILE');
    expect(createMsg).toBeTruthy();
    expect(createMsg!.payload.directory).toBe('.');
  });

  it('fits view in 2d when clicking Fit All Nodes', async () => {
    const methods = ForceGraph2D.getMockMethods();
    methods.zoomToFit.mockClear();

    const { container } = render(<Graph data={menuData} />);
    const graphContainer = getGraphContainer(container);

    await act(async () => {
      ForceGraph2D.simulateBackgroundRightClick();
      fireEvent.contextMenu(graphContainer, { clientX: 300, clientY: 300 });
    });

    await waitFor(() => {
      expect(screen.getByText('Fit All Nodes')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Fit All Nodes'));
    });

    expect(methods.zoomToFit).toHaveBeenCalledWith(300, 20);
  });

  it('fits view in 3d when clicking Fit All Nodes', async () => {
    const methods = ForceGraph3D.getMockMethods();
    methods.zoomToFit.mockClear();
    graphStore.setState({ graphMode: '3d' });

    const { container } = render(<Graph data={menuData} />);
    const graphContainer = getGraphContainer(container);

    await act(async () => {
      ForceGraph3D.simulateBackgroundRightClick();
      fireEvent.contextMenu(graphContainer, { clientX: 300, clientY: 300 });
    });

    await waitFor(() => {
      expect(screen.getByText('Fit All Nodes')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Fit All Nodes'));
    });

    expect(methods.zoomToFit).toHaveBeenCalledWith(300, 20);
  });

  it('does not show node plugin items on background context', async () => {
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
      ForceGraph2D.simulateBackgroundRightClick();
      fireEvent.contextMenu(graphContainer, { clientX: 300, clientY: 300 });
    });

    await waitFor(() => {
      expect(screen.getByText('New File...')).toBeInTheDocument();
    });
    expect(screen.queryByText('Plugin Inspect')).not.toBeInTheDocument();
  });

  it('shows background menu when right-clicking background even if a node is selected', async () => {
    const { container } = render(<Graph data={selectionData} />);
    const graphContainer = getGraphContainer(container);

    await act(async () => {
      ForceGraph2D.simulateNodeClick({ id: 'nodeA.ts' });
    });

    await act(async () => {
      ForceGraph2D.simulateBackgroundRightClick();
      fireEvent.contextMenu(graphContainer, { clientX: 500, clientY: 500 });
    });

    await waitFor(() => {
      expect(screen.getByText('New File...')).toBeInTheDocument();
    });
    expect(screen.queryByText('Open File')).not.toBeInTheDocument();
  });

  it('shows background menu when mac ctrl+clicking background even if a node is selected', async () => {
    const platformSpy = mockMacPlatform();
    try {
      render(<Graph data={selectionData} />);

      await act(async () => {
        ForceGraph2D.simulateNodeClick({ id: 'nodeA.ts' });
      });

      await act(async () => {
        ForceGraph2D.simulateBackgroundClick({ button: 0, ctrlKey: true, clientX: 500, clientY: 500 });
      });

      await waitFor(() => {
        expect(screen.getByText('New File...')).toBeInTheDocument();
      });
      expect(screen.queryByText('Open File')).not.toBeInTheDocument();
    } finally {
      platformSpy.mockRestore();
    }
  });
});
