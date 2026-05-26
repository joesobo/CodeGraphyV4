import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ForceGraph2D from 'react-force-graph-2d';
import ForceGraph3D from 'react-force-graph-3d';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../src/shared/graph/contracts';
import type { IPluginContextMenuItem } from '../../../../src/shared/plugins/contextMenu';
import Graph from '../../../../src/webview/components/graph/view/component';
import { graphStore } from '../../../../src/webview/store/state';

import { clearSentMessages, findMessage } from '../../../helpers/sentMessages';

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
