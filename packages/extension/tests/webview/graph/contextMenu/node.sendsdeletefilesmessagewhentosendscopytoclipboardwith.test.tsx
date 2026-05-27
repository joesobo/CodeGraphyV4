import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ForceGraph2D from 'react-force-graph-2d';
import ForceGraph3D from 'react-force-graph-3d';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../src/shared/graph/contracts';
import type { IPluginContextMenuItem } from '../../../../src/shared/plugins/contextMenu';
import Graph from '../../../../src/webview/components/graph/view/component';
import { graphStore } from '../../../../src/webview/store/state';

import { clearSentMessages, findMessage, getSentMessages } from '../../../helpers/sentMessages';

function getGraphContainer(container: HTMLElement): HTMLElement {
  const graphContainer = container.querySelector('[tabindex="0"]');
  expect(graphContainer).toBeTruthy();
  return graphContainer as HTMLElement;
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

describe('Graph context menu (node)', () => {



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
      act(() => {
        graphStore.setState({
          favorites: new Set<string>(),
          graphMode: '2d',
          timelineActive: false,
          pluginContextMenuItems: [],
        });
      });
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
      expect(screen.getByText('Pin Nodes')).toBeInTheDocument();
      expect(screen.getByText('Add Filter Patterns...')).toBeInTheDocument();
      expect(screen.getByText('Wrap Selected in Graph Section')).toBeInTheDocument();
      expect(screen.getByText('Delete 2 Files')).toBeInTheDocument();
      expect(screen.queryByText('Reveal in Explorer')).not.toBeInTheDocument();
      expect(screen.queryByText('Rename...')).not.toBeInTheDocument();
    });



    it('sends UPDATE_GRAPH_LAYOUT_PIN for the selected nodes when clicking Pin Nodes', async () => {
      const { container } = render(<Graph data={selectionData} />);
      const graphContainer = getGraphContainer(container);

      await selectTwoNodesForMultiMenu(graphContainer);

      await waitFor(() => {
        expect(screen.getByText('Pin Nodes')).toBeInTheDocument();
      });

      clearSentMessages();
      await act(async () => {
        fireEvent.click(screen.getByText('Pin Nodes'));
      });

      const pinMessages = getSentMessages().filter(msg => msg.type === 'UPDATE_GRAPH_LAYOUT_PIN');
      expect(pinMessages).toHaveLength(2);
      expect(pinMessages.map(msg => msg.payload)).toEqual([
        { graphMode: '2d', nodeId: 'nodeA.ts', position: { x: 10, y: 20 } },
        { graphMode: '2d', nodeId: 'nodeB.ts', position: { x: 40, y: 60 } },
      ]);
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
});
