import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TooltipProvider } from '../../../src/webview/components/ui/overlay/tooltip';
import { graphStore } from '../../../src/webview/store/state';

vi.mock('../../../src/webview/vscodeApi', () => ({
  postMessage: vi.fn(),
}));

// Mock dropdown components to render inline (Radix portals don't work in jsdom)
vi.mock('../../../src/webview/components/ui/menus/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-content">{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onSelect,
  }: {
    children: React.ReactNode;
    onSelect?: () => void;
  }) => (
    <button type="button" onClick={onSelect}>
      {children}
    </button>
  ),
  DropdownMenuSeparator: () => <hr data-testid="dropdown-separator" />,
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="dropdown-label">{children}</span>
  ),
}));

import { postMessage } from '../../../src/webview/vscodeApi';
import { ToolbarActions } from '../../../src/webview/components/toolbar/Actions';

function renderWithProviders() {
  return render(
    <TooltipProvider>
      <ToolbarActions />
    </TooltipProvider>,
  );
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
    fireEvent.click(screen.getByTitle('Refresh Graph'));
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
    fireEvent.click(screen.getByTitle('Plugins'));
    expect(graphStore.getState().activePanel).toBe('plugins');
  });

  it('renders the settings button with title', () => {
    renderWithProviders();
    expect(screen.getByTitle('Settings')).toBeInTheDocument();
  });

  it('sets active panel to settings when settings button is clicked', () => {
    renderWithProviders();
    fireEvent.click(screen.getByTitle('Settings'));
    expect(graphStore.getState().activePanel).toBe('settings');
  });

  it('renders SVG icons inside buttons', () => {
    const { container } = renderWithProviders();
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThanOrEqual(4);
  });

  it('applies backdrop-blur styling to buttons', () => {
    renderWithProviders();
    const refreshButton = screen.getByTitle('Refresh Graph');
    expect(refreshButton.className).toContain('backdrop-blur');
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

  it('posts REQUEST_EXPORT_PNG when export PNG is clicked', () => {
    const postMessageSpy = vi.spyOn(window, 'postMessage');
    renderWithProviders();
    fireEvent.click(screen.getByText('Export as PNG'));
    expect(postMessageSpy).toHaveBeenCalledWith({ type: 'REQUEST_EXPORT_PNG' }, '*');
    postMessageSpy.mockRestore();
  });

  it('posts REQUEST_EXPORT_SVG when export SVG is clicked', () => {
    const postMessageSpy = vi.spyOn(window, 'postMessage');
    renderWithProviders();
    fireEvent.click(screen.getByText('Export as SVG'));
    expect(postMessageSpy).toHaveBeenCalledWith({ type: 'REQUEST_EXPORT_SVG' }, '*');
    postMessageSpy.mockRestore();
  });

  it('posts REQUEST_EXPORT_JPEG when export JPEG is clicked', () => {
    const postMessageSpy = vi.spyOn(window, 'postMessage');
    renderWithProviders();
    fireEvent.click(screen.getByText('Export as JPEG'));
    expect(postMessageSpy).toHaveBeenCalledWith({ type: 'REQUEST_EXPORT_JPEG' }, '*');
    postMessageSpy.mockRestore();
  });

  it('posts REQUEST_EXPORT_JSON when export JSON is clicked', () => {
    const postMessageSpy = vi.spyOn(window, 'postMessage');
    renderWithProviders();
    fireEvent.click(screen.getByText('Export as JSON'));
    expect(postMessageSpy).toHaveBeenCalledWith({ type: 'REQUEST_EXPORT_JSON' }, '*');
    postMessageSpy.mockRestore();
  });

  it('posts REQUEST_EXPORT_MD when export Markdown is clicked', () => {
    const postMessageSpy = vi.spyOn(window, 'postMessage');
    renderWithProviders();
    fireEvent.click(screen.getByText('Export as Markdown'));
    expect(postMessageSpy).toHaveBeenCalledWith({ type: 'REQUEST_EXPORT_MD' }, '*');
    postMessageSpy.mockRestore();
  });

  it('renders the export icon SVG path for the export button', () => {
    renderWithProviders();
    const exportButton = screen.getByTitle('Export');
    const svg = exportButton.querySelector('svg');
    expect(svg).not.toBeNull();
    const path = svg?.querySelector('path');
    expect(path).not.toBeNull();
    expect(path?.getAttribute('d')).toBeTruthy();
  });

  it('renders the refresh icon SVG path', () => {
    renderWithProviders();
    const refreshButton = screen.getByTitle('Refresh Graph');
    const path = refreshButton.querySelector('svg path');
    expect(path).not.toBeNull();
    expect(path?.getAttribute('d')).toBeTruthy();
  });

  it('renders the plugins icon SVG path', () => {
    renderWithProviders();
    const pluginsButton = screen.getByTitle('Plugins');
    const path = pluginsButton.querySelector('svg path');
    expect(path).not.toBeNull();
    expect(path?.getAttribute('d')).toBeTruthy();
  });

  it('renders the settings icon SVG path', () => {
    renderWithProviders();
    const settingsButton = screen.getByTitle('Settings');
    const path = settingsButton.querySelector('svg path');
    expect(path).not.toBeNull();
    expect(path?.getAttribute('d')).toBeTruthy();
  });
});
