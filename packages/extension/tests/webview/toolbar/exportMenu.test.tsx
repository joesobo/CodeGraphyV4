import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TooltipProvider } from '../../../src/webview/components/ui/overlay/tooltip';
import { graphStore } from '../../../src/webview/store/state';
import { postMessage } from '../../../src/webview/vscodeApi';
import {
  ToolbarExportMenu,
  buildPluginExporterGroups,
  getPluginExporterKey,
} from '../../../src/webview/components/toolbar/exportMenu';

vi.mock('../../../src/webview/vscodeApi', () => ({
  postMessage: vi.fn(),
}));

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

function renderWithProviders() {
  return render(
    <TooltipProvider>
      <ToolbarExportMenu />
    </TooltipProvider>,
  );
}

const exportCases = [
  ['Export as PNG', 'REQUEST_EXPORT_PNG'],
  ['Export as SVG', 'REQUEST_EXPORT_SVG'],
  ['Export as JPEG', 'REQUEST_EXPORT_JPEG'],
  ['Export as JSON', 'REQUEST_EXPORT_JSON'],
  ['Export as Markdown', 'REQUEST_EXPORT_MD'],
] as const;

describe('ToolbarExportMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    graphStore.setState({ pluginExporters: [] });
  });

  it('renders the export button and default sections', () => {
    renderWithProviders();

    expect(screen.getByTitle('Export')).toBeInTheDocument();
    expect(screen.getByText('Images')).toBeInTheDocument();
    expect(screen.getByText('Connections')).toBeInTheDocument();
    expect(screen.queryByText('Plugins')).not.toBeInTheDocument();
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

  it.each(exportCases)('posts %s through window.postMessage when clicked', (label, type) => {
    const postMessageSpy = vi.spyOn(window, 'postMessage');

    renderWithProviders();
    fireEvent.click(screen.getByText(label));

    expect(postMessageSpy).toHaveBeenCalledWith({ type }, '*');
    postMessageSpy.mockRestore();
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

  it('builds stable keys for exporter items', () => {
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
});
