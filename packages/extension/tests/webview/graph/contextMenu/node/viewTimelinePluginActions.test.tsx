import { describe, expect, it } from 'vitest';
import type { IPluginContextMenuItem } from '../../../../../src/shared/plugins/contextMenu';
import {
  act,
  findMessage,
  fireEvent,
  getGraphContainer,
  Graph,
  graphStore,
  menuData,
  openNodeMenu,
  render,
  screen,
  selectionData,
  selectTwoNodesForMultiMenu,
  setupGraphContextMenuTest,
  waitFor,
} from './viewHarness';

describe('Graph node context menu timeline and plugin actions', () => {
  setupGraphContextMenuTest();

  it('keeps filter actions but disables file-changing single-node actions in timeline snapshots', async () => {
    graphStore.setState({ timelineActive: true });
    await openNodeMenu(menuData);

    await waitFor(() => {
      expect(screen.getByText('Open File')).toBeInTheDocument();
    });
    expect(screen.getByText('Copy Relative Path')).toBeInTheDocument();
    expect(screen.getByText('Copy Absolute Path')).toBeInTheDocument();
    expect(screen.getByText('Focus Node')).toBeInTheDocument();
    expect(screen.queryByText('Reveal in Explorer')).not.toBeInTheDocument();
    expect(screen.getByText('Add Filter Pattern')).toBeInTheDocument();
    expect(screen.getByText('Add Legend Group')).toBeInTheDocument();
    expect(screen.getByText('Rename')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('Delete File')).toHaveAttribute('aria-disabled', 'true');
  });

  it('keeps filter actions but disables file-changing multi-node actions in timeline snapshots', async () => {
    graphStore.setState({ timelineActive: true });
    const { container } = render(<Graph data={selectionData} />);
    const graphContainer = getGraphContainer(container);
    await selectTwoNodesForMultiMenu(graphContainer);

    await waitFor(() => {
      expect(screen.getByText('Open 2 Files')).toBeInTheDocument();
    });
    expect(screen.getByText('Copy Relative Paths')).toBeInTheDocument();
    expect(screen.getByText('Add All to Favorites')).toBeInTheDocument();
    expect(screen.getByText('Add Filter Patterns')).toBeInTheDocument();
    expect(screen.getByText('Delete 2 Files')).toHaveAttribute('aria-disabled', 'true');
  });

  it('renders plugin node items in timeline mode', async () => {
    const pluginItem: IPluginContextMenuItem = {
      label: 'Plugin Timeline Action',
      when: 'node',
      pluginId: 'acme.plugin',
      index: 2,
    };
    graphStore.setState({ timelineActive: true, pluginContextMenuItems: [pluginItem] });
    await openNodeMenu(menuData);

    await waitFor(() => {
      expect(screen.getByText('Plugin Timeline Action')).toBeInTheDocument();
    });
  });

  it('dispatches plugin node items to the extension host', async () => {
    const pluginItem: IPluginContextMenuItem = {
      label: 'Plugin Inspect',
      when: 'node',
      pluginId: 'acme.plugin',
      index: 0,
    };
    graphStore.setState({ pluginContextMenuItems: [pluginItem] });
    await openNodeMenu(menuData);

    await waitFor(() => {
      expect(screen.getByText('Plugin Inspect')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Plugin Inspect'));
    });

    expect(findMessage('PLUGIN_CONTEXT_MENU_ACTION')?.payload).toEqual({
      pluginId: 'acme.plugin',
      index: 0,
      targetId: 'src/app.ts',
      targetType: 'node',
    });
  });
});
