import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ForceGraph2D from 'react-force-graph-2d';
import ForceGraph3D from 'react-force-graph-3d';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../src/shared/graph/contracts';
import Graph from '../../../../src/webview/components/graph/view/component';
import { graphStore } from '../../../../src/webview/store/state';

import { clearSentMessages } from '../../../helpers/sentMessages';

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

const menuData: IGraphData = {
  nodes: [
    { id: 'src/app.ts', label: 'app.ts', color: '#93C5FD', x: 12, y: -24 },
    { id: 'src/utils.ts', label: 'utils.ts', color: '#67E8F9', x: 72, y: 36 },
  ],
  edges: [{ id: 'src/app.ts->src/utils.ts', from: 'src/app.ts', to: 'src/utils.ts' , kind: 'import', sources: [] }],
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
      expect(screen.getByText('Pin Node')).toBeInTheDocument();
      expect(screen.getByText('Add Filter Pattern...')).toBeInTheDocument();
      expect(screen.getByText('Wrap Selected in Graph Section')).toBeInTheDocument();
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
});
