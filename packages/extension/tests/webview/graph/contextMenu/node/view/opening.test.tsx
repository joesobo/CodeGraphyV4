import { describe, expect, it } from 'vitest';
import {
  act,
  fireEvent,
  ForceGraph2D,
  ForceGraph3D,
  getGraphContainer,
  Graph,
  graphStore,
  menuData,
  mockMacPlatform,
  openNodeMenu,
  render,
  screen,
  selectionData,
  setupGraphContextMenuTest,
  waitFor,
  waitForThreeDimensionalSurface,
} from './harness';

describe('Graph node context menu opening', () => {
  setupGraphContextMenuTest();

  it('opens in 2d from onNodeRightClick alone', async () => {
    render(<Graph data={menuData} />);

    await act(async () => {
      ForceGraph2D.simulateNodeRightClick({ id: 'src/app.ts' });
    });

    await waitFor(() => {
      expect(screen.getByText('Open File')).toBeInTheDocument();
    });
  });

  it('opens in 3d from onNodeRightClick alone', async () => {
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

  it('treats mac ctrl+click as right-click in 2d', async () => {
    const platformSpy = mockMacPlatform();
    try {
      render(<Graph data={menuData} />);

      await act(async () => {
        ForceGraph2D.simulateNodeClick(
          { id: 'src/app.ts' },
          { button: 0, ctrlKey: true, clientX: 120, clientY: 90 },
        );
      });

      await waitFor(() => {
        expect(screen.getByText('Open File')).toBeInTheDocument();
      });
    } finally {
      platformSpy.mockRestore();
    }
  });

  it('treats mac ctrl+click as right-click in 3d', async () => {
    const platformSpy = mockMacPlatform();
    try {
      await act(async () => {
        graphStore.setState({ graphMode: '3d' });
      });
      render(<Graph data={menuData} />);
      await waitForThreeDimensionalSurface();

      await act(async () => {
        ForceGraph3D.simulateNodeClick(
          { id: 'src/app.ts' },
          { button: 0, ctrlKey: true, clientX: 130, clientY: 95 },
        );
      });

      await waitFor(() => {
        expect(screen.getByText('Open File')).toBeInTheDocument();
      });
    } finally {
      platformSpy.mockRestore();
    }
  });

  it('shows actions for the clicked node even when another node is selected', async () => {
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

  it('keeps node actions visible after right-click when tooltips are present', async () => {
    await openNodeMenu();

    await waitFor(() => {
      expect(screen.getByText('Open File')).toBeInTheDocument();
    });
  });
});
