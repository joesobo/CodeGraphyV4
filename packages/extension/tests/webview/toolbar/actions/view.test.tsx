import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { mdiLinkVariant } from '@mdi/js';
import { TooltipProvider } from '../../../../src/webview/components/ui/overlay/tooltip';
import { graphStore } from '../../../../src/webview/store/state';

vi.mock('../../../../src/webview/vscodeApi', () => ({
  postMessage: vi.fn(),
}));

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
    {
      children: React.ReactNode;
      className?: string;
      disabled?: boolean;
      onSelect?: () => void;
    }
  >(({ children, className, disabled, onSelect }, ref) => (
    <button
      ref={ref}
      type="button"
      className={className}
      disabled={disabled}
      onClick={onSelect}
    >
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

const iconButtonTitles = ['Index Workspace', 'Layout', 'Node Size', 'New...', 'Graph Scope', 'Themes', 'Plugins', 'Settings'] as const;

function renderWithProviders(props: Partial<React.ComponentProps<typeof ToolbarActions>> = {}) {
  return render(
    <TooltipProvider>
      <ToolbarActions {...props} />
    </TooltipProvider>,
  );
}

function enableRuntimeGraphViewContributions() {
  graphStore.setState({
    graphViewContributionStatuses: [
      {
        kind: 'runtimeNodes',
        pluginId: 'acme.graph-tools',
        contributionId: 'acme.graph-tools.runtime-nodes',
        label: 'Runtime Nodes',
      },
      {
        kind: 'projections',
        pluginId: 'acme.graph-tools',
        contributionId: 'acme.graph-tools.projection',
        label: 'Runtime Projection',
      },
    ],
  });
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
      dagMode: null,
      graphMode: '2d',
      nodeSizeMode: 'connections',
      graphViewportScale: null,
      graphViewContributionStatuses: [],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders lifecycle, graph tools, and system groups without feature-specific public actions', () => {
    enableRuntimeGraphViewContributions();
    renderWithProviders();

    expect(screen.getByTestId('toolbar-lifecycle-group')).toBeInTheDocument();
    expect(screen.getByTestId('toolbar-graph-tools-group')).toBeInTheDocument();
    expect(screen.getByTestId('toolbar-system-group')).toBeInTheDocument();
    expect(screen.getByTitle('Index Workspace')).toBeInTheDocument();
    expect(screen.getByTitle('Layout')).toBeInTheDocument();
    expect(screen.getByTitle('Node Size')).toBeInTheDocument();
    expect(screen.getByTitle('New...')).toBeInTheDocument();
    expect(screen.getByText('New File...')).toBeInTheDocument();
    expect(screen.getByText('New Folder...')).toBeInTheDocument();
    expect(screen.getByTitle('Graph Scope')).toBeInTheDocument();
    expect(screen.queryByTitle('Export')).not.toBeInTheDocument();
  });

  it('keeps the public create menu limited to filesystem actions', () => {
    renderWithProviders();

    expect(screen.getByText('New File...')).toBeInTheDocument();
    expect(screen.getByText('New Folder...')).toBeInTheDocument();
  });

  it('sends INDEX_GRAPH message when the initial index button is clicked', () => {
    renderWithProviders();
    clickAction('Index Workspace');

    expect(postMessage).toHaveBeenCalledWith({ type: 'INDEX_GRAPH' });
    expect(graphStore.getState().graphIsIndexing).toBe(true);
  });

  it('renders a reindex button title when the saved index is stale', () => {
    graphStore.setState({
      graphHasIndex: false,
      graphIndexFreshness: 'stale',
      graphIndexDetail: 'Commit changed since last index.',
    });

    renderWithProviders();

    expect(screen.getByTitle('Reindex Workspace')).toBeInTheDocument();
  });

  it('sends REFRESH_GRAPH when a graph index already exists', () => {
    graphStore.setState({ graphHasIndex: true });

    renderWithProviders();
    clickAction('Refresh');

    expect(postMessage).toHaveBeenCalledWith({ type: 'REFRESH_GRAPH' });
    expect(graphStore.getState().graphIsIndexing).toBe(true);
  });

  it('clears the optimistic loading state if the extension never responds', () => {
    renderWithProviders();
    clickAction('Index Workspace');

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(graphStore.getState().graphIsIndexing).toBe(false);
    expect(graphStore.getState().graphIndexProgress).toBeNull();
  });

  it('opens and closes core panels from rail buttons', () => {
    renderWithProviders();

    clickAction('Graph Scope');
    expect(graphStore.getState().activePanel).toBe('graphScope');

    clickAction('Graph Scope');
    expect(graphStore.getState().activePanel).toBe('none');

    clickAction('Themes');
    expect(graphStore.getState().activePanel).toBe('legends');

    clickAction('Plugins');
    expect(graphStore.getState().activePanel).toBe('plugins');

    clickAction('Settings');
    expect(graphStore.getState().activePanel).toBe('settings');
  });

  it('renders the core toolbar buttons in the expected top-to-bottom order', () => {
    renderWithProviders();

    const orderedTitles = screen
      .getAllByRole('button')
      .map((button) => button.getAttribute('title'))
      .filter((title): title is string =>
        ['Index Workspace', 'Layout', 'Node Size', 'New...', 'Graph Scope', 'Themes', 'Plugins', 'Settings'].includes(title ?? ''),
      );

    expect(orderedTitles).toEqual([
      'Index Workspace',
      'Layout',
      'Node Size',
      'New...',
      'Graph Scope',
      'Themes',
      'Plugins',
      'Settings',
    ]);
  });

  it('orders the graph tool rail create menu as file and folder without a separator', () => {
    enableRuntimeGraphViewContributions();
    renderWithProviders();

    const createMenu = screen.getByText('New File...').closest('[data-testid="dropdown-content"]');

    expect(createMenu).not.toBeNull();
    expect(
      within(createMenu as HTMLElement)
        .getAllByRole('button')
        .map(button => button.textContent?.trim()),
    ).toEqual(['New File...', 'New Folder...']);
    expect(within(createMenu as HTMLElement).queryByTestId('dropdown-separator')).not.toBeInTheDocument();
  });

  it('renders graph-view create contributions beside file and folder actions', () => {
    const run = vi.fn();
    const pluginHost = {
      getGraphViewContributions: vi.fn(() => ({
        runtimeNodes: [],
        runtimeEdges: [],
        projections: [],
        forces: [],
        nodeDragEnd: [],
        contextMenu: [{
          pluginId: 'acme.graph-tools',
          contribution: {
            id: 'acme.new-plugin-node',
            label: 'New Plugin Node...',
            placement: { menu: 'create' },
            targets: [{ kind: 'background' }],
            run,
          },
        }],
        ui: [],
      })),
      subscribeGraphViewContributions: vi.fn(() => ({ dispose: vi.fn() })),
    };

    renderWithProviders({ pluginHost: pluginHost as never });

    const createMenu = screen.getByText('New File...').closest('[data-testid="dropdown-content"]');
    expect(
      within(createMenu as HTMLElement)
        .getAllByRole('button')
        .map(button => button.textContent?.trim()),
    ).toEqual(['New File...', 'New Folder...', 'New Plugin Node...']);

    fireEvent.click(screen.getByText('New Plugin Node...'));

    expect(run).toHaveBeenCalledWith({
      graphMode: '2d',
      target: { kind: 'background' },
      selectedNodeIds: [],
      selectedEdgeIds: [],
      timelineActive: false,
    });
  });

  it('posts root creation messages from the graph tool rail create menu', () => {
    enableRuntimeGraphViewContributions();
    renderWithProviders();
    expect(screen.getByText('New File...').closest('button')).toHaveClass('gap-2');

    fireEvent.click(screen.getByText('New File...'));

    expect(postMessage).toHaveBeenCalledWith({
      type: 'CREATE_FILE',
      payload: { directory: '.' },
    });

    fireEvent.click(screen.getByText('New Folder...'));

    expect(postMessage).toHaveBeenCalledWith({
      type: 'CREATE_FOLDER',
      payload: { directory: '.' },
    });

  });

  it.each(iconButtonTitles)('renders an SVG icon path for %s', (title) => {
    renderWithProviders();
    const icon = screen.getByTitle(title).querySelector('svg');

    expect(icon).not.toBeNull();
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
