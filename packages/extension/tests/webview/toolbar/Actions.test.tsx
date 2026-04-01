import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
import { ToolbarActions } from '../../../src/webview/components/toolbar/Actions';

const exportCases = [
  ['Export as PNG', 'REQUEST_EXPORT_PNG'],
  ['Export as SVG', 'REQUEST_EXPORT_SVG'],
  ['Export as JPEG', 'REQUEST_EXPORT_JPEG'],
  ['Export as JSON', 'REQUEST_EXPORT_JSON'],
  ['Export as Markdown', 'REQUEST_EXPORT_MD'],
] as const;

const iconButtonTitles = ['Export', 'Refresh Graph', 'Plugins', 'Settings'] as const;

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
    graphStore.setState({ activePanel: 'none' });
  });

  it('renders all four action buttons', () => {
    renderWithProviders();
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(4);
  });

  it('renders the refresh button with title', () => {
    renderWithProviders();
    expect(screen.getByTitle('Refresh Graph')).toBeInTheDocument();
  });

  it('sends REFRESH_GRAPH message when refresh button is clicked', () => {
    renderWithProviders();
    clickAction('Refresh Graph');
    expect(postMessage).toHaveBeenCalledWith({ type: 'REFRESH_GRAPH' });
  });

  it('renders the export button with title', () => {
    renderWithProviders();
    expect(screen.getByTitle('Export')).toBeInTheDocument();
  });

  it('renders the plugins button with title', () => {
    renderWithProviders();
    expect(screen.getByTitle('Plugins')).toBeInTheDocument();
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
    const refreshButton = screen.getByTitle('Refresh Graph');
    expect(refreshButton.className).toContain('bg-transparent');
    expect(refreshButton.className).not.toContain('backdrop-blur');
  });

  it('applies correct button sizing classes', () => {
    renderWithProviders();
    const refreshButton = screen.getByTitle('Refresh Graph');
    expect(refreshButton.className).toContain('h-7');
    expect(refreshButton.className).toContain('w-7');
  });
});

describe('ToolbarActions export dropdown items', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
