import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TooltipProvider } from '../../../src/webview/components/ui/tooltip';
import { DimensionToggle } from '../../../src/webview/components/toolbar/DimensionToggle';
import { graphStore } from '../../../src/webview/store';

function renderWithProviders() {
  return render(
    <TooltipProvider>
      <DimensionToggle />
    </TooltipProvider>,
  );
}

describe('DimensionToggle (mutation targets)', () => {
  beforeEach(() => {
    graphStore.setState({ graphMode: '2d' });
  });

  it('toggles from 2d to 3d when clicked in 2d mode', () => {
    graphStore.setState({ graphMode: '2d' });
    renderWithProviders();
    const button = screen.getByRole('button');
    expect(graphStore.getState().graphMode).toBe('2d');
    fireEvent.click(button);
    expect(graphStore.getState().graphMode).toBe('3d');
  });

  it('toggles from 3d to 2d when clicked in 3d mode', () => {
    graphStore.setState({ graphMode: '3d' });
    renderWithProviders();
    const button = screen.getByRole('button');
    expect(graphStore.getState().graphMode).toBe('3d');
    fireEvent.click(button);
    expect(graphStore.getState().graphMode).toBe('2d');
  });

  it('uses mdiCircleOutline for 2d and mdiSphere for 3d (different SVG paths)', () => {
    graphStore.setState({ graphMode: '2d' });
    const { container: c2d, unmount } = renderWithProviders();
    const path2d = c2d.querySelector('svg path')?.getAttribute('d');
    unmount();

    graphStore.setState({ graphMode: '3d' });
    const { container: c3d } = renderWithProviders();
    const path3d = c3d.querySelector('svg path')?.getAttribute('d');

    expect(path2d).toBeDefined();
    expect(path3d).toBeDefined();
    expect(path2d).not.toBe(path3d);
  });

  it('does not stay in 2d when clicking in 2d mode', () => {
    graphStore.setState({ graphMode: '2d' });
    renderWithProviders();
    fireEvent.click(screen.getByRole('button'));
    expect(graphStore.getState().graphMode).not.toBe('2d');
  });

  it('does not stay in 3d when clicking in 3d mode', () => {
    graphStore.setState({ graphMode: '3d' });
    renderWithProviders();
    fireEvent.click(screen.getByRole('button'));
    expect(graphStore.getState().graphMode).not.toBe('3d');
  });

  it('applies bg-popover/80 class to the button', () => {
    renderWithProviders();
    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-popover');
  });

  it('applies backdrop-blur-sm class to the button', () => {
    renderWithProviders();
    const button = screen.getByRole('button');
    expect(button.className).toContain('backdrop-blur');
  });
});
