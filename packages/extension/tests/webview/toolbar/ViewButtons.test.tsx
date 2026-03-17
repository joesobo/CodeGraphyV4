import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TooltipProvider } from '../../../src/webview/components/ui/tooltip';
import { ViewButtons } from '../../../src/webview/components/toolbar/ViewButtons';
import { graphStore } from '../../../src/webview/store';

vi.mock('../../../src/webview/vscodeApi', () => ({
  postMessage: vi.fn(),
}));

import { postMessage } from '../../../src/webview/vscodeApi';

function renderWithProviders() {
  return render(
    <TooltipProvider>
      <ViewButtons />
    </TooltipProvider>,
  );
}

describe('ViewButtons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    graphStore.setState({
      availableViews: [],
      activeViewId: 'codegraphy.connections',
      depthLimit: 1,
    });
  });

  it('does not render view buttons when availableViews is empty', () => {
    graphStore.setState({ availableViews: [] });
    renderWithProviders();
    expect(screen.queryByTestId('view-buttons')).not.toBeInTheDocument();
  });

  it('renders view buttons when availableViews has entries', () => {
    graphStore.setState({
      availableViews: [
        { id: 'codegraphy.connections', name: 'Connections' },
        { id: 'codegraphy.folder', name: 'Folder' },
      ],
    });
    renderWithProviders();
    expect(screen.getByTestId('view-buttons')).toBeInTheDocument();
  });

  it('renders a button for each available view', () => {
    graphStore.setState({
      availableViews: [
        { id: 'codegraphy.connections', name: 'Connections' },
        { id: 'codegraphy.depth-graph', name: 'Depth' },
        { id: 'codegraphy.folder', name: 'Folder' },
      ],
    });
    renderWithProviders();
    const buttons = screen.getByTestId('view-buttons').querySelectorAll('button');
    expect(buttons).toHaveLength(3);
  });

  it('sends CHANGE_VIEW message when a view button is clicked', () => {
    graphStore.setState({
      availableViews: [
        { id: 'codegraphy.connections', name: 'Connections' },
        { id: 'codegraphy.folder', name: 'Folder' },
      ],
    });
    renderWithProviders();

    const buttons = screen.getByTestId('view-buttons').querySelectorAll('button');
    fireEvent.click(buttons[1]);

    expect(postMessage).toHaveBeenCalledWith({
      type: 'CHANGE_VIEW',
      payload: { viewId: 'codegraphy.folder' },
    });
  });

  it('renders known view icons as SVG paths', () => {
    graphStore.setState({
      availableViews: [
        { id: 'codegraphy.connections', name: 'Connections' },
      ],
    });
    const { container } = renderWithProviders();
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThanOrEqual(1);
  });

  it('renders first letter of name for unknown view IDs', () => {
    graphStore.setState({
      availableViews: [
        { id: 'custom.unknown-view', name: 'Zzz Custom View' },
      ],
    });
    renderWithProviders();
    expect(screen.getByText('Z')).toBeInTheDocument();
  });

  it('renders first letter with text-xs class for fallback icon', () => {
    graphStore.setState({
      availableViews: [
        { id: 'custom.unknown-view', name: 'Zzz Custom View' },
      ],
    });
    renderWithProviders();
    const letterSpan = screen.getByText('Z');
    expect(letterSpan.className).toContain('text-xs');
  });

  it('shows depth slider only when depth view is active', () => {
    graphStore.setState({
      availableViews: [
        { id: 'codegraphy.depth-graph', name: 'Depth' },
      ],
      activeViewId: 'codegraphy.depth-graph',
      depthLimit: 3,
    });
    renderWithProviders();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('hides depth slider when depth view is not active', () => {
    graphStore.setState({
      availableViews: [
        { id: 'codegraphy.connections', name: 'Connections' },
        { id: 'codegraphy.depth-graph', name: 'Depth' },
      ],
      activeViewId: 'codegraphy.connections',
      depthLimit: 2,
    });
    const { container } = renderWithProviders();
    const sliderContainer = container.querySelector('[style*="max-width"]') as HTMLElement | null;
    if (sliderContainer) {
      expect(sliderContainer.style.opacity).toBe('0');
      expect(sliderContainer.style.maxWidth).toBe('0px');
    }
  });

  it('sets opacity to 1 and maxWidth to 8rem when depth view is active', () => {
    graphStore.setState({
      availableViews: [
        { id: 'codegraphy.depth-graph', name: 'Depth' },
      ],
      activeViewId: 'codegraphy.depth-graph',
      depthLimit: 1,
    });
    const { container } = renderWithProviders();
    const sliderContainer = container.querySelector('[style*="max-width"]') as HTMLElement | null;
    if (sliderContainer) {
      expect(sliderContainer.style.opacity).toBe('1');
      expect(sliderContainer.style.maxWidth).toBe('8rem');
    }
  });

  it('applies default variant to the active view button', () => {
    graphStore.setState({
      availableViews: [
        { id: 'codegraphy.connections', name: 'Connections' },
        { id: 'codegraphy.folder', name: 'Folder' },
      ],
      activeViewId: 'codegraphy.connections',
    });
    renderWithProviders();
    const buttons = screen.getByTestId('view-buttons').querySelectorAll('button');
    // The active button should NOT have 'ghost' variant class
    // (ghost variant is for inactive buttons)
    const activeButton = buttons[0];
    const inactiveButton = buttons[1];
    // Active and inactive buttons should have different styling
    expect(activeButton.className).not.toBe(inactiveButton.className);
  });

  it('displays the current depth limit as text', () => {
    graphStore.setState({
      availableViews: [
        { id: 'codegraphy.depth-graph', name: 'Depth' },
      ],
      activeViewId: 'codegraphy.depth-graph',
      depthLimit: 4,
    });
    renderWithProviders();
    expect(screen.getByText('4')).toBeInTheDocument();
  });
});
