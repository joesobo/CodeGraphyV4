import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, screen, fireEvent, waitFor } from '@testing-library/react';
import Graph from '../../../../src/webview/components/Graph';
import type { IGraphData } from '../../../../src/shared/graph/types';
import type { IPluginContextMenuItem } from '../../../../src/shared/plugins/contextMenu';
import { graphStore } from '../../../../src/webview/store/state';
import ForceGraph2D from 'react-force-graph-2d';
import ForceGraph3D from 'react-force-graph-3d';

import { clearSentMessages, findMessage } from '../../../helpers/sentMessages';

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
  edges: [{ id: 'src/app.ts->src/utils.ts', from: 'src/app.ts', to: 'src/utils.ts' , kind: 'import', sources: [] }],
};

const edge = {
  id: 'src/app.ts->src/utils.ts',
  from: 'src/app.ts',
  to: 'src/utils.ts',
};

describe('Graph context menu (edge)', () => {
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

  it('opens edge menu in 2d from onLinkRightClick alone', async () => {
    render(<Graph data={menuData} />);

    await act(async () => {
      ForceGraph2D.simulateLinkRightClick(edge);
    });

    await waitFor(() => {
      expect(screen.getByText('Copy Source Path')).toBeInTheDocument();
    });
    expect(screen.getByText('Copy Target Path')).toBeInTheDocument();
    expect(screen.getByText('Copy Both Paths')).toBeInTheDocument();
  });

  it('opens edge menu in 3d from onLinkRightClick alone', async () => {
    await act(async () => {
      graphStore.setState({ graphMode: '3d' });
    });
    render(<Graph data={menuData} />);

    await act(async () => {
      ForceGraph3D.simulateLinkRightClick(edge);
    });

    await waitFor(() => {
      expect(screen.getByText('Copy Source Path')).toBeInTheDocument();
    });
    expect(screen.getByText('Copy Target Path')).toBeInTheDocument();
    expect(screen.getByText('Copy Both Paths')).toBeInTheDocument();
  });

  it('shows edge menu items from mac ctrl+click in 2d (same as right-click)', async () => {
    const platformSpy = mockMacPlatform();
    try {
      render(<Graph data={menuData} />);

      await act(async () => {
        ForceGraph2D.simulateLinkClick(edge, { button: 0, ctrlKey: true, clientX: 210, clientY: 180 });
      });

      await waitFor(() => {
        expect(screen.getByText('Copy Source Path')).toBeInTheDocument();
      });
      expect(screen.getByText('Copy Target Path')).toBeInTheDocument();
      expect(screen.getByText('Copy Both Paths')).toBeInTheDocument();
    } finally {
      platformSpy.mockRestore();
    }
  });

  it('shows edge menu items from mac ctrl+click in 3d (same as right-click)', async () => {
    const platformSpy = mockMacPlatform();
    try {
      await act(async () => {
        graphStore.setState({ graphMode: '3d' });
      });
      render(<Graph data={menuData} />);

      await act(async () => {
        ForceGraph3D.simulateLinkClick(edge, { button: 0, ctrlKey: true, clientX: 215, clientY: 185 });
      });

      await waitFor(() => {
        expect(screen.getByText('Copy Source Path')).toBeInTheDocument();
      });
      expect(screen.getByText('Copy Target Path')).toBeInTheDocument();
      expect(screen.getByText('Copy Both Paths')).toBeInTheDocument();
    } finally {
      platformSpy.mockRestore();
    }
  });

  it('shows only edge actions when right-clicking an edge', async () => {
    const { container } = render(<Graph data={menuData} />);
    const graphContainer = getGraphContainer(container);

    await act(async () => {
      ForceGraph2D.simulateLinkRightClick(edge);
      fireEvent.contextMenu(graphContainer, { clientX: 180, clientY: 160 });
    });

    await waitFor(() => {
      expect(screen.getByText('Copy Source Path')).toBeInTheDocument();
    });
    expect(screen.getByText('Copy Target Path')).toBeInTheDocument();
    expect(screen.getByText('Copy Both Paths')).toBeInTheDocument();
    expect(screen.queryByText('Open File')).not.toBeInTheDocument();
    expect(screen.queryByText('New File...')).not.toBeInTheDocument();
  });

  it('keeps edge actions available in timeline mode', async () => {
    graphStore.setState({ timelineActive: true });
    const { container } = render(<Graph data={menuData} />);
    const graphContainer = getGraphContainer(container);

    await act(async () => {
      ForceGraph2D.simulateLinkRightClick(edge);
      fireEvent.contextMenu(graphContainer, { clientX: 180, clientY: 160 });
    });

    await waitFor(() => {
      expect(screen.getByText('Copy Source Path')).toBeInTheDocument();
    });
    expect(screen.getByText('Copy Target Path')).toBeInTheDocument();
    expect(screen.getByText('Copy Both Paths')).toBeInTheDocument();
  });

  it('sends COPY_TO_CLIPBOARD source path when clicking Copy Source Path', async () => {
    const { container } = render(<Graph data={menuData} />);
    const graphContainer = getGraphContainer(container);

    await act(async () => {
      ForceGraph2D.simulateLinkRightClick(edge);
      fireEvent.contextMenu(graphContainer, { clientX: 200, clientY: 180 });
    });

    await waitFor(() => {
      expect(screen.getByText('Copy Source Path')).toBeInTheDocument();
    });

    clearSentMessages();
    await act(async () => {
      fireEvent.click(screen.getByText('Copy Source Path'));
    });

    const copyMsg = findMessage('COPY_TO_CLIPBOARD');
    expect(copyMsg).toBeTruthy();
    expect(copyMsg!.payload.text).toBe('src/app.ts');
  });

  it('sends COPY_TO_CLIPBOARD target path when clicking Copy Target Path', async () => {
    const { container } = render(<Graph data={menuData} />);
    const graphContainer = getGraphContainer(container);

    await act(async () => {
      ForceGraph2D.simulateLinkRightClick(edge);
      fireEvent.contextMenu(graphContainer, { clientX: 200, clientY: 180 });
    });

    await waitFor(() => {
      expect(screen.getByText('Copy Target Path')).toBeInTheDocument();
    });

    clearSentMessages();
    await act(async () => {
      fireEvent.click(screen.getByText('Copy Target Path'));
    });

    const copyMsg = findMessage('COPY_TO_CLIPBOARD');
    expect(copyMsg).toBeTruthy();
    expect(copyMsg!.payload.text).toBe('src/utils.ts');
  });

  it('sends COPY_TO_CLIPBOARD both paths when clicking Copy Both Paths', async () => {
    const { container } = render(<Graph data={menuData} />);
    const graphContainer = getGraphContainer(container);

    await act(async () => {
      ForceGraph2D.simulateLinkRightClick(edge);
      fireEvent.contextMenu(graphContainer, { clientX: 200, clientY: 180 });
    });

    await waitFor(() => {
      expect(screen.getByText('Copy Both Paths')).toBeInTheDocument();
    });

    clearSentMessages();
    await act(async () => {
      fireEvent.click(screen.getByText('Copy Both Paths'));
    });

    const copyMsg = findMessage('COPY_TO_CLIPBOARD');
    expect(copyMsg).toBeTruthy();
    expect(copyMsg!.payload.text).toBe('src/app.ts\nsrc/utils.ts');
  });

  it('dispatches PLUGIN_CONTEXT_MENU_ACTION for edge plugin item', async () => {
    const pluginItem: IPluginContextMenuItem = {
      label: 'Edge Inspect',
      when: 'edge',
      pluginId: 'acme.plugin',
      index: 1,
    };
    graphStore.setState({ pluginContextMenuItems: [pluginItem] });

    const { container } = render(<Graph data={menuData} />);
    const graphContainer = getGraphContainer(container);

    await act(async () => {
      ForceGraph2D.simulateLinkRightClick(edge);
      fireEvent.contextMenu(graphContainer, { clientX: 220, clientY: 210 });
    });

    await waitFor(() => {
      expect(screen.getByText('Edge Inspect')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Edge Inspect'));
    });

    const pluginMsg = findMessage('PLUGIN_CONTEXT_MENU_ACTION');
    expect(pluginMsg).toBeTruthy();
    expect(pluginMsg!.payload).toEqual({
      pluginId: 'acme.plugin',
      index: 1,
      targetId: 'src/app.ts->src/utils.ts',
      targetType: 'edge',
    });
  });

  it('keeps plugin edge items visible in timeline mode', async () => {
    const pluginItem: IPluginContextMenuItem = {
      label: 'Edge Timeline Action',
      when: 'edge',
      pluginId: 'acme.plugin',
      index: 3,
    };
    graphStore.setState({ timelineActive: true, pluginContextMenuItems: [pluginItem] });

    const { container } = render(<Graph data={menuData} />);
    const graphContainer = getGraphContainer(container);

    await act(async () => {
      ForceGraph2D.simulateLinkRightClick(edge);
      fireEvent.contextMenu(graphContainer, { clientX: 210, clientY: 180 });
    });

    await waitFor(() => {
      expect(screen.getByText('Edge Timeline Action')).toBeInTheDocument();
    });
  });
});
