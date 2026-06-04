import { describe, expect, it, vi } from 'vitest';
import {
  act,
  clearSentMessages,
  findMessage,
  fireEvent,
  getGraphContainer,
  getSentMessages,
  Graph,
  render,
  screen,
  selectionData,
  selectTwoNodesForMultiMenu,
  setupGraphContextMenuTest,
  waitFor,
} from './harness';

describe('Graph node context menu selection actions', () => {
  setupGraphContextMenuTest();

  it('shows multi-node actions for the selected node set', async () => {
    const graphContainer = renderSelectionGraph();
    await selectTwoNodesForMultiMenu(graphContainer);

    await waitFor(() => {
      expect(screen.getByText('Open 2 Files')).toBeInTheDocument();
    });

    expect(screen.getByText('Copy Relative Paths')).toBeInTheDocument();
    expect(screen.getByText('Add All to Favorites')).toBeInTheDocument();
    expect(screen.getByText('Add Filter Patterns')).toBeInTheDocument();
    expect(screen.getByText('Delete 2 Files')).toBeInTheDocument();
    expect(screen.queryByText('Reveal in Explorer')).not.toBeInTheDocument();
    expect(screen.queryByText('Rename')).not.toBeInTheDocument();
  });

  it('posts Open, Copy, Favorite, Filter, and Delete actions for all selected nodes', async () => {
    const onAddFilterRequested = vi.fn();
    const { container } = render(
      <Graph data={selectionData} onAddFilterRequested={onAddFilterRequested} />,
    );
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
    expect(openMessages.map(msg => msg.payload.path)).toEqual(['nodeA.ts', 'nodeB.ts']);

    await selectTwoNodesForMultiMenu(graphContainer);
    clearSentMessages();
    await act(async () => {
      fireEvent.click(screen.getByText('Copy Relative Paths'));
    });
    expect(findMessage('COPY_TO_CLIPBOARD')?.payload.text).toBe('nodeA.ts\nnodeB.ts');

    await selectTwoNodesForMultiMenu(graphContainer);
    clearSentMessages();
    await act(async () => {
      fireEvent.click(screen.getByText('Add All to Favorites'));
    });
    expect(findMessage('TOGGLE_FAVORITE')?.payload.paths).toEqual(['nodeA.ts', 'nodeB.ts']);

    await selectTwoNodesForMultiMenu(graphContainer);
    await act(async () => {
      fireEvent.click(screen.getByText('Add Filter Patterns'));
    });
    expect(onAddFilterRequested).toHaveBeenCalledWith(['nodeA.ts', 'nodeB.ts']);

    await selectTwoNodesForMultiMenu(graphContainer);
    clearSentMessages();
    await act(async () => {
      fireEvent.click(screen.getByText('Delete 2 Files'));
    });
    expect(findMessage('DELETE_FILES')?.payload.paths).toEqual(['nodeA.ts', 'nodeB.ts']);
  });
});

function renderSelectionGraph(): HTMLElement {
  const { container } = render(<Graph data={selectionData} />);
  return getGraphContainer(container);
}

