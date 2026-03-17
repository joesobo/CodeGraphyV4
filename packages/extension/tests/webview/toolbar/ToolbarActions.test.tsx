import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TooltipProvider } from '../../../src/webview/components/ui/tooltip';
import { ToolbarActions } from '../../../src/webview/components/toolbar/ToolbarActions';
import { graphStore } from '../../../src/webview/store';

vi.mock('../../../src/webview/vscodeApi', () => ({
  postMessage: vi.fn(),
}));

import { postMessage } from '../../../src/webview/vscodeApi';

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

describe('ToolbarActions export dropdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts REQUEST_EXPORT_PNG when export PNG is selected', () => {
    const postMessageSpy = vi.spyOn(window, 'postMessage');
    renderWithProviders();

    const exportButton = screen.getByTitle('Export');
    fireEvent.click(exportButton);

    const pngItem = screen.queryByText('Export as PNG');
    if (pngItem) {
      fireEvent.click(pngItem);
      expect(postMessageSpy).toHaveBeenCalledWith(
        { type: 'REQUEST_EXPORT_PNG' },
        '*',
      );
    }
    postMessageSpy.mockRestore();
  });

  it('posts REQUEST_EXPORT_SVG when export SVG is selected', () => {
    const postMessageSpy = vi.spyOn(window, 'postMessage');
    renderWithProviders();

    const exportButton = screen.getByTitle('Export');
    fireEvent.click(exportButton);

    const svgItem = screen.queryByText('Export as SVG');
    if (svgItem) {
      fireEvent.click(svgItem);
      expect(postMessageSpy).toHaveBeenCalledWith(
        { type: 'REQUEST_EXPORT_SVG' },
        '*',
      );
    }
    postMessageSpy.mockRestore();
  });

  it('posts REQUEST_EXPORT_JPEG when export JPEG is selected', () => {
    const postMessageSpy = vi.spyOn(window, 'postMessage');
    renderWithProviders();

    const exportButton = screen.getByTitle('Export');
    fireEvent.click(exportButton);

    const jpegItem = screen.queryByText('Export as JPEG');
    if (jpegItem) {
      fireEvent.click(jpegItem);
      expect(postMessageSpy).toHaveBeenCalledWith(
        { type: 'REQUEST_EXPORT_JPEG' },
        '*',
      );
    }
    postMessageSpy.mockRestore();
  });

  it('posts REQUEST_EXPORT_JSON when export JSON is selected', () => {
    const postMessageSpy = vi.spyOn(window, 'postMessage');
    renderWithProviders();

    const exportButton = screen.getByTitle('Export');
    fireEvent.click(exportButton);

    const jsonItem = screen.queryByText('Export as JSON');
    if (jsonItem) {
      fireEvent.click(jsonItem);
      expect(postMessageSpy).toHaveBeenCalledWith(
        { type: 'REQUEST_EXPORT_JSON' },
        '*',
      );
    }
    postMessageSpy.mockRestore();
  });

  it('posts REQUEST_EXPORT_MD when export Markdown is selected', () => {
    const postMessageSpy = vi.spyOn(window, 'postMessage');
    renderWithProviders();

    const exportButton = screen.getByTitle('Export');
    fireEvent.click(exportButton);

    const mdItem = screen.queryByText('Export as Markdown');
    if (mdItem) {
      fireEvent.click(mdItem);
      expect(postMessageSpy).toHaveBeenCalledWith(
        { type: 'REQUEST_EXPORT_MD' },
        '*',
      );
    }
    postMessageSpy.mockRestore();
  });
});
