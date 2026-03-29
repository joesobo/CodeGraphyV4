import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { graphStore } from '../../../../../src/webview/store/state';

// Mock tooltip components to render inline so we can test tooltip content
vi.mock('../../../src/webview/components/ui/overlay/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="tooltip-content">{children}</span>
  ),
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { DimensionToggle } from '../../../src/webview/components/toolbar/DimensionToggle';

function renderComponent() {
  return render(<DimensionToggle />);
}

describe('DimensionToggle (mutation targets)', () => {
  beforeEach(() => {
    graphStore.setState({ graphMode: '2d' });
  });

  it('toggles from 2d to 3d when clicked in 2d mode', () => {
    graphStore.setState({ graphMode: '2d' });
    renderComponent();
    const button = screen.getByRole('button');
    expect(graphStore.getState().graphMode).toBe('2d');
    fireEvent.click(button);
    expect(graphStore.getState().graphMode).toBe('3d');
  });

  it('toggles from 3d to 2d when clicked in 3d mode', () => {
    graphStore.setState({ graphMode: '3d' });
    renderComponent();
    const button = screen.getByRole('button');
    expect(graphStore.getState().graphMode).toBe('3d');
    fireEvent.click(button);
    expect(graphStore.getState().graphMode).toBe('2d');
  });

  it('uses mdiCircleOutline for 2d and mdiSphere for 3d (different SVG paths)', () => {
    graphStore.setState({ graphMode: '2d' });
    const { container: c2d, unmount } = renderComponent();
    const path2d = c2d.querySelector('svg path')?.getAttribute('d');
    unmount();

    graphStore.setState({ graphMode: '3d' });
    const { container: c3d } = renderComponent();
    const path3d = c3d.querySelector('svg path')?.getAttribute('d');

    expect(path2d).toBeDefined();
    expect(path3d).toBeDefined();
    expect(path2d).not.toBe(path3d);
  });

  it('does not stay in 2d when clicking in 2d mode', () => {
    graphStore.setState({ graphMode: '2d' });
    renderComponent();
    fireEvent.click(screen.getByRole('button'));
    expect(graphStore.getState().graphMode).not.toBe('2d');
  });

  it('does not stay in 3d when clicking in 3d mode', () => {
    graphStore.setState({ graphMode: '3d' });
    renderComponent();
    fireEvent.click(screen.getByRole('button'));
    expect(graphStore.getState().graphMode).not.toBe('3d');
  });

  it('applies bg-popover/80 class to the button', () => {
    renderComponent();
    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-popover');
  });

  it('applies backdrop-blur-sm class to the button', () => {
    renderComponent();
    const button = screen.getByRole('button');
    expect(button.className).toContain('backdrop-blur');
  });

  it('shows 2D Mode tooltip text when in 2d mode', () => {
    graphStore.setState({ graphMode: '2d' });
    renderComponent();
    const tooltip = screen.getByTestId('tooltip-content');
    expect(tooltip.textContent).toBe('2D Mode');
  });

  it('shows 3D Mode tooltip text when in 3d mode', () => {
    graphStore.setState({ graphMode: '3d' });
    renderComponent();
    const tooltip = screen.getByTestId('tooltip-content');
    expect(tooltip.textContent).toBe('3D Mode');
  });

  it('tooltip text differs between 2d and 3d modes', () => {
    graphStore.setState({ graphMode: '2d' });
    const { unmount } = renderComponent();
    const tooltip2d = screen.getByTestId('tooltip-content').textContent;
    unmount();

    graphStore.setState({ graphMode: '3d' });
    renderComponent();
    const tooltip3d = screen.getByTestId('tooltip-content').textContent;

    expect(tooltip2d).not.toBe(tooltip3d);
  });

  it('tooltip text is not empty in 2d mode', () => {
    graphStore.setState({ graphMode: '2d' });
    renderComponent();
    const tooltip = screen.getByTestId('tooltip-content');
    expect(tooltip.textContent).not.toBe('');
  });

  it('tooltip text is not empty in 3d mode', () => {
    graphStore.setState({ graphMode: '3d' });
    renderComponent();
    const tooltip = screen.getByTestId('tooltip-content');
    expect(tooltip.textContent).not.toBe('');
  });
});
