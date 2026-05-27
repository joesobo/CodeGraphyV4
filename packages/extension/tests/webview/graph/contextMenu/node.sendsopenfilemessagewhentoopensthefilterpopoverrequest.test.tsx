import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ForceGraph2D from 'react-force-graph-2d';
import ForceGraph3D from 'react-force-graph-3d';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../src/shared/graph/contracts';
import Graph from '../../../../src/webview/components/graph/view/component';
import { graphStore } from '../../../../src/webview/store/state';

import { clearSentMessages, findMessage } from '../../../helpers/sentMessages';

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
});
