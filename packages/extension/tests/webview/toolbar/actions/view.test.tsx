import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { mdiLinkVariant } from '@mdi/js';
import { TooltipProvider } from '../../../../src/webview/components/ui/overlay/tooltip';
import { graphStore } from '../../../../src/webview/store/state';

vi.mock('../../../../src/webview/vscodeApi', () => ({
  postMessage: vi.fn(),
}));

// Mock dropdown components to render inline (Radix portals don't work in jsdom)
vi.mock('../../../../src/webview/components/ui/menus/dropdown-menu', () => {
  const DropdownMenuTrigger = React.forwardRef<HTMLDivElement, { children: React.ReactNode }>(
    ({ children }, ref) => <div ref={ref}>{children}</div>,
  );
  DropdownMenuTrigger.displayName = 'DropdownMenuTrigger';

  const DropdownMenuContent = React.forwardRef<HTMLDivElement, { children: React.ReactNode }>(
    ({ children }, ref) => (
      <div ref={ref} data-testid="dropdown-content">{children}</div>
    ),
  );
  DropdownMenuContent.displayName = 'DropdownMenuContent';

  const DropdownMenuItem = React.forwardRef<
    HTMLButtonElement,
    { children: React.ReactNode; onSelect?: () => void }
  >(({ children, onSelect }, ref) => (
    <button ref={ref} type="button" onClick={onSelect}>
      {children}
    </button>
  ));
  DropdownMenuItem.displayName = 'DropdownMenuItem';

  return {
    DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator: () => <hr data-testid="dropdown-separator" />,
    DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => (
      <span data-testid="dropdown-label">{children}</span>
    ),
  };
});

import { postMessage } from '../../../../src/webview/vscodeApi';
import {
  ToolbarActions,
  getToolbarActionIconPath,
  getToolbarActionItemKey,
  getToolbarActionKey,
} from '../../../../src/webview/components/toolbar/actions/view';
import {
  buildPluginExporterGroups,
  getPluginExporterKey,
} from '../../../../src/webview/components/export/model';

const iconButtonTitles = ['Index Repo', 'Export', 'Nodes', 'Edges', 'Legends', 'Plugins', 'Settings'] as const;

function renderWithProviders() {
  return render(
    <TooltipProvider>
      <ToolbarActions />
    </TooltipProvider>,
  );
}

function clickAction(title: string) {
  fireEvent.click(screen.getByTitle(title));
}

describe('ToolbarActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    graphStore.setState({
      activePanel: 'none',
      pluginExporters: [],
      pluginToolbarActions: [],
      graphHasIndex: false,
      graphIndexFreshness: 'missing',
      graphIndexDetail: null,
      graphIsIndexing: false,
      graphIndexProgress: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders all four action buttons', () => {
    renderWithProviders();
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(4);
  });

  it('renders the index button with title when no graph index exists', () => {
    renderWithProviders();
    expect(screen.getByTitle('Index Repo')).toBeInTheDocument();
  });

  it('sends INDEX_GRAPH message when the initial index button is clicked', () => {
    renderWithProviders();
    clickAction('Index Repo');
    expect(postMessage).toHaveBeenCalledWith({ type: 'INDEX_GRAPH' });
    expect(graphStore.getState().graphIsIndexing).toBe(true);
    expect(graphStore.getState().graphIndexProgress).toEqual({
      phase: 'Indexing Repo',
      current: 0,
      total: 1,
    });
  });

  it('renders a reindex button title when the saved index is stale', () => {
    graphStore.setState({
      graphHasIndex: false,
      graphIndexFreshness: 'stale',
      graphIndexDetail: 'Commit changed since last index.',
    });

    renderWithProviders();

    expect(screen.getByTitle('Reindex Repo')).toBeInTheDocument();
  });

  it('sends REFRESH_GRAPH when a stale index should be rebuilt', () => {
    graphStore.setState({
      graphHasIndex: false,
      graphIndexFreshness: 'stale',
      graphIndexDetail: 'Commit changed since last index.',
    });

    renderWithProviders();
    clickAction('Reindex Repo');

    expect(postMessage).toHaveBeenCalledWith({ type: 'REFRESH_GRAPH' });
    expect(graphStore.getState().graphIndexProgress).toEqual({
      phase: 'Refreshing Index',
      current: 0,
      total: 1,
    });
  });

  it('renders the refresh button title when a graph index exists', () => {
    graphStore.setState({ graphHasIndex: true });

    renderWithProviders();

    expect(screen.getByTitle('Refresh')).toBeInTheDocument();
  });

  it('disables the index button while indexing is already in progress', () => {
    graphStore.setState({
      graphHasIndex: true,
      graphIsIndexing: true,
      graphIndexProgress: {
        phase: 'Refreshing Index',
        current: 0,
        total: 1,
      },
    });

    renderWithProviders();

    expect(screen.getByTitle('Refresh')).toBeDisabled();
  });

  it('sends REFRESH_GRAPH when a graph index already exists', () => {
    graphStore.setState({ graphHasIndex: true });

    renderWithProviders();
    clickAction('Refresh');

    expect(postMessage).toHaveBeenCalledWith({ type: 'REFRESH_GRAPH' });
    expect(graphStore.getState().graphIsIndexing).toBe(true);
    expect(graphStore.getState().graphIndexProgress).toEqual({
      phase: 'Refreshing Index',
      current: 0,
      total: 1,
    });
  });

  it('clears the optimistic loading state if the extension never responds', () => {
    renderWithProviders();
    clickAction('Index Repo');

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(graphStore.getState().graphIsIndexing).toBe(false);
    expect(graphStore.getState().graphIndexProgress).toBeNull();
  });

  it('renders the export button with title', () => {
    renderWithProviders();
    expect(screen.getByTitle('Export')).toBeInTheDocument();
  });

  it('sets active panel to export when the export button is clicked', () => {
    renderWithProviders();
    clickAction('Export');
    expect(graphStore.getState().activePanel).toBe('export');
  });

  it('closes the export panel when the export button is clicked again', () => {
    graphStore.setState({ activePanel: 'export' as never });

    renderWithProviders();
    clickAction('Export');

    expect(graphStore.getState().activePanel).toBe('none');
  });

  it('renders toolbar action buttons before the export button when plugin toolbar actions are available', () => {
    graphStore.setState({
      pluginToolbarActions: [
        {
          id: 'docs',
          label: 'Docs',
          pluginId: 'plugin.docs',
          pluginName: 'Docs Plugin',
          index: 0,
          items: [
            {
              id: 'docs-summary',
              label: 'Docs Summary',
              index: 0,
            },
          ],
        },
      ],
    });

    renderWithProviders();

    const docsButton = screen.getByTitle('Docs');
    const exportButton = screen.getByTitle('Export');
    expect(docsButton.compareDocumentPosition(exportButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('renders the plugins button with title', () => {
    renderWithProviders();
    expect(screen.getByTitle('Plugins')).toBeInTheDocument();
  });

  it('sets active panel to legends when legends button is clicked', () => {
    renderWithProviders();
    clickAction('Legends');
    expect(graphStore.getState().activePanel).toBe('legends');
  });

  it('sets active panel to plugins when plugins button is clicked', () => {
    renderWithProviders();
    clickAction('Plugins');
    expect(graphStore.getState().activePanel).toBe('plugins');
  });

  it('closes the nodes panel when the nodes button is clicked again', () => {
    graphStore.setState({ activePanel: 'nodes' });

    renderWithProviders();
    clickAction('Nodes');

    expect(graphStore.getState().activePanel).toBe('none');
  });

  it('closes the settings panel when the settings button is clicked again', () => {
    graphStore.setState({ activePanel: 'settings' });

    renderWithProviders();
    clickAction('Settings');

    expect(graphStore.getState().activePanel).toBe('none');
  });

  it('renders the settings button with title', () => {
    renderWithProviders();
    expect(screen.getByTitle('Settings')).toBeInTheDocument();
  });

  it('renders the core toolbar buttons in the expected top-to-bottom order', () => {
    renderWithProviders();

    const orderedTitles = screen
      .getAllByRole('button')
      .map((button) => button.getAttribute('title'))
      .filter((title): title is string =>
        ['Index Repo', 'Export', 'Nodes', 'Edges', 'Legends', 'Plugins', 'Settings'].includes(title ?? ''),
      );

    expect(orderedTitles).toEqual([
      'Index Repo',
      'Export',
      'Nodes',
      'Edges',
      'Legends',
      'Plugins',
      'Settings',
    ]);
  });

  it('sets active panel to settings when settings button is clicked', () => {
    renderWithProviders();
    clickAction('Settings');
    expect(graphStore.getState().activePanel).toBe('settings');
  });

  it('renders SVG icons inside buttons', () => {
    const { container } = renderWithProviders();
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThanOrEqual(4);
  });

  it('keeps action buttons transparent', () => {
    renderWithProviders();
    const refreshButton = screen.getByTitle('Index Repo');
    expect(refreshButton.className).toContain('bg-transparent');
    expect(refreshButton.className).not.toContain('backdrop-blur');
  });

  it('applies correct button sizing classes', () => {
    renderWithProviders();
    const refreshButton = screen.getByTitle('Index Repo');
    expect(refreshButton.className).toContain('h-7');
    expect(refreshButton.className).toContain('w-7');
  });
});

describe('ToolbarActions export dropdown items', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    graphStore.setState({ pluginExporters: [], pluginToolbarActions: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each(iconButtonTitles)('renders an SVG icon path for %s', (title) => {
    renderWithProviders();
    const path = screen.getByTitle(title).querySelector('svg path');

    expect(path).not.toBeNull();
    expect(path?.getAttribute('d')).toBeTruthy();
  });

  it('renders a toolbar action popup when plugin toolbar actions are available', () => {
    graphStore.setState({
      pluginToolbarActions: [
        {
          id: 'wikilinks',
          label: 'Docs',
          pluginId: 'plugin.docs',
          pluginName: 'Docs Plugin',
          index: 0,
          items: [
            {
              id: 'docs-summary',
              label: 'Docs Summary',
              index: 0,
            },
          ],
        },
      ],
    });

    renderWithProviders();

    expect(screen.getByTitle('Docs')).toBeInTheDocument();
    expect(screen.getByText('Docs Summary')).toBeInTheDocument();
  });

  it('posts RUN_PLUGIN_TOOLBAR_ACTION through the host api when a toolbar action item is clicked', () => {
    graphStore.setState({
      pluginToolbarActions: [
        {
          id: 'wikilinks',
          label: 'Docs',
          pluginId: 'plugin.docs',
          pluginName: 'Docs Plugin',
          index: 0,
          items: [
            {
              id: 'docs-summary',
              label: 'Docs Summary',
              index: 0,
            },
          ],
        },
      ],
    });

    const postMessageSpy = vi.spyOn(window, 'postMessage');

    renderWithProviders();
    fireEvent.click(screen.getByText('Docs Summary'));

    expect(postMessageSpy).toHaveBeenCalledWith({
      type: 'RUN_PLUGIN_TOOLBAR_ACTION',
      payload: {
        pluginId: 'plugin.docs',
        index: 0,
        itemIndex: 0,
      },
    }, '*');
    postMessageSpy.mockRestore();
  });

  it('renders the default link icon when a toolbar action has no custom icon', () => {
    graphStore.setState({
      pluginToolbarActions: [
        {
          id: 'wikilinks',
          label: 'Docs',
          pluginId: 'plugin.docs',
          pluginName: 'Docs Plugin',
          index: 0,
          items: [
            {
              id: 'docs-summary',
              label: 'Docs Summary',
              index: 0,
            },
          ],
        },
      ],
    });

    renderWithProviders();

    expect(screen.getByTitle('Docs').querySelector('path')).toHaveAttribute(
      'd',
      mdiLinkVariant,
    );
  });
});

describe('ToolbarActions helpers', () => {
  it('builds stable keys for toolbar actions and exporter items', () => {
    expect(
      getToolbarActionKey({
        id: 'docs',
        label: 'Docs',
        pluginId: 'plugin.docs',
        pluginName: 'Docs Plugin',
        index: 0,
        items: [],
      }),
    ).toBe('plugin.docs:docs:0');

    expect(
      getToolbarActionItemKey(
        {
          id: 'docs',
          label: 'Docs',
          pluginId: 'plugin.docs',
          pluginName: 'Docs Plugin',
          index: 0,
          items: [],
        },
        {
          id: 'docs-summary',
          label: 'Docs Summary',
          index: 1,
        },
      ),
    ).toBe('plugin.docs:docs:1');

    expect(
      getPluginExporterKey({
        id: 'summary',
        label: 'Summary Export',
        pluginId: 'plugin.docs',
        pluginName: 'Docs Plugin',
        index: 0,
      }),
    ).toBe('plugin.docs:summary:0');
  });

  it('groups plugin exporters by plugin label and group label', () => {
    expect(
      buildPluginExporterGroups([
        {
          id: 'summary',
          label: 'Summary Export',
          pluginId: 'plugin.docs',
          pluginName: 'Docs Plugin',
          index: 0,
          group: 'Reports',
        },
        {
          id: 'details',
          label: 'Details Export',
          pluginId: 'plugin.docs',
          pluginName: 'Docs Plugin',
          index: 1,
          group: 'Reports',
        },
        {
          id: 'archive',
          label: 'Archive Export',
          pluginId: 'plugin.docs',
          pluginName: 'Docs Plugin',
          index: 2,
        },
      ]),
    ).toEqual([
      {
        key: 'Docs Plugin / Reports',
        label: 'Docs Plugin / Reports',
        items: [
          {
            id: 'summary',
            label: 'Summary Export',
            pluginId: 'plugin.docs',
            pluginName: 'Docs Plugin',
            index: 0,
            group: 'Reports',
          },
          {
            id: 'details',
            label: 'Details Export',
            pluginId: 'plugin.docs',
            pluginName: 'Docs Plugin',
            index: 1,
            group: 'Reports',
          },
        ],
      },
      {
        key: 'Docs Plugin',
        label: 'Docs Plugin',
        items: [
          {
            id: 'archive',
            label: 'Archive Export',
            pluginId: 'plugin.docs',
            pluginName: 'Docs Plugin',
            index: 2,
          },
        ],
      },
    ]);
  });

  it('uses the link icon fallback when a toolbar action has no icon', () => {
    expect(getToolbarActionIconPath({ icon: undefined })).toBe(mdiLinkVariant);
  });
});
