import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { mdiLinkVariant } from '@mdi/js';
import { TooltipProvider } from '../../../src/webview/components/ui/overlay/tooltip';
import { graphStore } from '../../../src/webview/store/state';

vi.mock('../../../src/webview/vscodeApi', () => ({
  postMessage: vi.fn(),
}));

// Mock dropdown components to render inline (Radix portals don't work in jsdom)
vi.mock('../../../src/webview/components/ui/menus/dropdown-menu', () => {
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

import { postMessage } from '../../../src/webview/vscodeApi';
import {
  ToolbarActions,
  getToolbarActionIconPath,
  getToolbarActionItemKey,
  getToolbarActionKey,
} from '../../../src/webview/components/toolbar/Actions';
import {
  buildPluginExporterGroups,
  getPluginExporterKey,
} from '../../../src/webview/components/toolbar/exportMenu';

const exportCases = [
  ['Export as PNG', 'REQUEST_EXPORT_PNG'],
  ['Export as SVG', 'REQUEST_EXPORT_SVG'],
  ['Export as JPEG', 'REQUEST_EXPORT_JPEG'],
  ['Export as JSON', 'REQUEST_EXPORT_JSON'],
  ['Export as Markdown', 'REQUEST_EXPORT_MD'],
] as const;

const iconButtonTitles = ['Export', 'Index Repo', 'Legends', 'Plugins', 'Settings'] as const;

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

function clickExportItem(label: string) {
  const postMessageSpy = vi.spyOn(window, 'postMessage');

  renderWithProviders();
  fireEvent.click(screen.getByText(label));

  return postMessageSpy;
}

describe('ToolbarActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    graphStore.setState({
      activePanel: 'none',
      pluginExporters: [],
      pluginToolbarActions: [],
      graphHasIndex: false,
      isIndexing: false,
    });
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

  it('sends REFRESH_GRAPH message when index button is clicked', () => {
    renderWithProviders();
    clickAction('Index Repo');
    expect(postMessage).toHaveBeenCalledWith({ type: 'REFRESH_GRAPH' });
  });

  it('renders the refresh button title when a graph index exists', () => {
    graphStore.setState({ graphHasIndex: true });

    renderWithProviders();

    expect(screen.getByTitle('Refresh Graph')).toBeInTheDocument();
  });

  it('renders the export button with title', () => {
    renderWithProviders();
    expect(screen.getByTitle('Export')).toBeInTheDocument();
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

  it('renders the settings button with title', () => {
    renderWithProviders();
    expect(screen.getByTitle('Settings')).toBeInTheDocument();
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
    graphStore.setState({ pluginExporters: [], pluginToolbarActions: [] });
  });

  it('renders all five export menu items', () => {
    renderWithProviders();
    expect(screen.getByText('Export as PNG')).toBeInTheDocument();
    expect(screen.getByText('Export as SVG')).toBeInTheDocument();
    expect(screen.getByText('Export as JPEG')).toBeInTheDocument();
    expect(screen.getByText('Export as JSON')).toBeInTheDocument();
    expect(screen.getByText('Export as Markdown')).toBeInTheDocument();
  });

  it('renders Images and Connections section labels', () => {
    renderWithProviders();
    expect(screen.getByText('Images')).toBeInTheDocument();
    expect(screen.getByText('Connections')).toBeInTheDocument();
  });

  it('does not render a plugin exporter section when no exporters are available', () => {
    renderWithProviders();

    expect(
      screen.queryAllByTestId('dropdown-label').map(label => label.textContent),
    ).toEqual(['Images', 'Connections']);
  });

  it.each(exportCases)('posts %s when clicked', (label, type) => {
    const postMessageSpy = clickExportItem(label);

    expect(postMessageSpy).toHaveBeenCalledWith({ type }, '*');
    postMessageSpy.mockRestore();
  });

  it.each(iconButtonTitles)('renders an SVG icon path for %s', (title) => {
    renderWithProviders();
    const path = screen.getByTitle(title).querySelector('svg path');

    expect(path).not.toBeNull();
    expect(path?.getAttribute('d')).toBeTruthy();
  });

  it('renders plugin exporter sections when plugin exporters are available', () => {
    graphStore.setState({
      pluginExporters: [
        {
          id: 'summary',
          label: 'Summary Export',
          pluginId: 'plugin.docs',
          pluginName: 'Docs Plugin',
          index: 0,
          group: 'Reports',
        },
      ],
    });

    renderWithProviders();

    expect(screen.getByText('Plugins')).toBeInTheDocument();
    expect(screen.getByText('Docs Plugin / Reports')).toBeInTheDocument();
    expect(screen.getByText('Summary Export')).toBeInTheDocument();
  });

  it('renders duplicate exporters under the same plugin group label', () => {
    graphStore.setState({
      pluginExporters: [
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
    });

    renderWithProviders();

    expect(screen.getAllByText('Docs Plugin / Reports')).toHaveLength(1);
    expect(screen.getByText('Summary Export')).toBeInTheDocument();
    expect(screen.getByText('Details Export')).toBeInTheDocument();
  });

  it('posts RUN_PLUGIN_EXPORT through the host api when a plugin exporter is clicked', () => {
    graphStore.setState({
      pluginExporters: [
        {
          id: 'summary',
          label: 'Summary Export',
          pluginId: 'plugin.docs',
          pluginName: 'Docs Plugin',
          index: 0,
        },
      ],
    });

    renderWithProviders();
    fireEvent.click(screen.getByText('Summary Export'));

    expect(postMessage).toHaveBeenCalledWith({
      type: 'RUN_PLUGIN_EXPORT',
      payload: {
        pluginId: 'plugin.docs',
        index: 0,
      },
    });
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
