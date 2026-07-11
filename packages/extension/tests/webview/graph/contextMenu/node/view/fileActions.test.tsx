import { describe, expect, it, vi } from 'vitest';
import {
  act,
  clearSentMessages,
  findMessage,
  fireEvent,
  ForceGraph2D,
  getGraphContainer,
  Graph,
  graphStore,
  menuData,
  openNodeMenu,
  render,
  screen,
  setupGraphContextMenuTest,
  waitFor,
} from './harness';

describe('Graph node context menu file actions', () => {
  setupGraphContextMenuTest();

  it('shows file node actions', async () => {
    await openNodeMenu();

    await waitFor(() => {
      expect(screen.getByText('Open File')).toBeInTheDocument();
    });

    expect(screen.getByText('Reveal in Explorer')).toBeInTheDocument();
    expect(screen.getByText('Copy Relative Path')).toBeInTheDocument();
    expect(screen.getByText('Copy Absolute Path')).toBeInTheDocument();
    expect(screen.getByText('Focus Node')).toBeInTheDocument();
    expect(screen.getByText('Add Filter Pattern')).toBeInTheDocument();
    expect(screen.getByText('Rename')).toBeInTheDocument();
    expect(screen.getByText('Delete File')).toBeInTheDocument();
    expect(screen.queryByText('New File')).not.toBeInTheDocument();
    expect(screen.queryByText('Refresh')).not.toBeInTheDocument();
  });

  it('uses favorite labels that match the node favorite state', async () => {
    graphStore.setState({ favorites: new Set(['src/app.ts']) });
    await openNodeMenu();
    await waitFor(() => {
      expect(screen.getByText('Remove from Favorites')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.keyDown(document.body, { key: 'Escape' });
    });
    await openNodeMenu(menuData, 'src/utils.ts');
    await waitFor(() => {
      expect(screen.getByText('Add to Favorites')).toBeInTheDocument();
    });
  });

  it('posts open, reveal, and copy messages for the selected file node', async () => {
    await openNodeMenu();
    await waitFor(() => {
      expect(screen.getByText('Open File')).toBeInTheDocument();
    });

    clearSentMessages();
    await act(async () => {
      fireEvent.click(screen.getByText('Open File'));
    });
    expect(findMessage('OPEN_FILE')?.payload.path).toBe('src/app.ts');

    await openNodeMenu();
    clearSentMessages();
    await act(async () => {
      fireEvent.click(screen.getByText('Reveal in Explorer'));
    });
    expect(findMessage('REVEAL_IN_EXPLORER')?.payload.path).toBe('src/app.ts');

    await openNodeMenu();
    clearSentMessages();
    await act(async () => {
      fireEvent.click(screen.getByText('Copy Relative Path'));
    });
    expect(findMessage('COPY_TO_CLIPBOARD')?.payload.text).toBe('src/app.ts');

    await openNodeMenu();
    clearSentMessages();
    await act(async () => {
      fireEvent.click(screen.getByText('Copy Absolute Path'));
    });
    expect(findMessage('COPY_TO_CLIPBOARD')?.payload.text).toBe('absolute:src/app.ts');

  });

  it('posts file mutation messages for the selected file node', async () => {
    await openNodeMenu();
    await waitFor(() => {
      expect(screen.getByText('Rename')).toBeInTheDocument();
    });

    clearSentMessages();
    await act(async () => {
      fireEvent.click(screen.getByText('Rename'));
    });
    expect(findMessage('RENAME_FILE')?.payload.path).toBe('src/app.ts');

    await openNodeMenu();
    clearSentMessages();
    await act(async () => {
      fireEvent.click(screen.getByText('Add to Favorites'));
    });
    expect(findMessage('TOGGLE_FAVORITE')?.payload.paths).toContain('src/app.ts');

    await openNodeMenu();
    clearSentMessages();
    await act(async () => {
      fireEvent.click(screen.getByText('Delete File'));
    });
    expect(findMessage('DELETE_FILES')?.payload.paths).toContain('src/app.ts');
  });

  it('focuses a file node in 2d', async () => {
    const methods = ForceGraph2D.getMockMethods();
    methods.centerAt.mockClear();
    methods.zoom.mockClear();

    await openNodeMenu();
    await waitFor(() => {
      expect(screen.getByText('Focus Node')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Focus Node'));
    });

    expect(methods.centerAt).toHaveBeenCalledWith(12, -24, 300);
    expect(methods.zoom).toHaveBeenCalledWith(1.5, 300);
  });

  it('opens filter popover requests for the selected file node', async () => {
    const onAddFilterRequested = vi.fn();
    const { container } = render(
      <Graph data={menuData} onAddFilterRequested={onAddFilterRequested} />,
    );
    const graphContainer = getGraphContainer(container);

    await act(async () => {
      ForceGraph2D.simulateNodeRightClick({ id: 'src/app.ts' });
      fireEvent.contextMenu(graphContainer, { clientX: 100, clientY: 100 });
    });

    await waitFor(() => {
      expect(screen.getByText('Add Filter Pattern')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Add Filter Pattern'));
    });

    expect(onAddFilterRequested).toHaveBeenCalledWith(['src/app.ts']);
  });

  it('updates the favorite action after favorite state changes', async () => {
    await openNodeMenu();
    await waitFor(() => {
      expect(screen.getByText('Add to Favorites')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.keyDown(document.body, { key: 'Escape' });
      graphStore.getState().toggleFavoritesOptimistically(['src/app.ts']);
    });

    await waitFor(() => {
      expect(screen.queryByText('Add to Favorites')).not.toBeInTheDocument();
    });

    await openNodeMenu();
    await waitFor(() => {
      expect(screen.getByText('Remove from Favorites')).toBeInTheDocument();
    });
  });
});
