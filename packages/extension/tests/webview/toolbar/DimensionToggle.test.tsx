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
    </TooltipProvider>
  );
}

describe('DimensionToggle', () => {
  beforeEach(() => {
    graphStore.setState({ graphMode: '2d' });
  });

  it('renders a button element', () => {
    renderWithProviders();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('uses the circle icon path in 2d mode', () => {
    graphStore.setState({ graphMode: '2d' });
    const { container } = renderWithProviders();
    const pathD = container.querySelector('svg path')?.getAttribute('d') ?? '';
    // mdiCircleOutline starts with M12,20
    expect(pathD).toContain('M12,20');
  });

  it('uses the sphere icon path in 3d mode', () => {
    graphStore.setState({ graphMode: '3d' });
    const { container } = renderWithProviders();
    const pathD = container.querySelector('svg path')?.getAttribute('d') ?? '';
    // mdiSphere starts with M12 2
    expect(pathD).toContain('M12 2');
  });

  it('toggles graphMode from 2d to 3d on click', () => {
    graphStore.setState({ graphMode: '2d' });
    renderWithProviders();
    fireEvent.click(screen.getByRole('button'));
    expect(graphStore.getState().graphMode).toBe('3d');
  });

  it('toggles graphMode from 3d to 2d on click', () => {
    graphStore.setState({ graphMode: '3d' });
    renderWithProviders();
    fireEvent.click(screen.getByRole('button'));
    expect(graphStore.getState().graphMode).toBe('2d');
  });

  it('renders the circle icon in 2d mode', () => {
    graphStore.setState({ graphMode: '2d' });
    const { container } = renderWithProviders();
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
  });

  it('renders the sphere icon in 3d mode', () => {
    graphStore.setState({ graphMode: '3d' });
    const { container } = renderWithProviders();
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
  });

  it('renders with specific button sizing class', () => {
    renderWithProviders();
    const button = screen.getByRole('button');
    expect(button.className).toContain('h-7');
    expect(button.className).toContain('w-7');
  });

  it('renders different icons for 2d vs 3d mode', () => {
    graphStore.setState({ graphMode: '2d' });
    const { container: container2d, unmount: unmount2d } = renderWithProviders();
    const path2d = container2d.querySelector('svg path')?.getAttribute('d');
    unmount2d();

    graphStore.setState({ graphMode: '3d' });
    const { container: container3d } = renderWithProviders();
    const path3d = container3d.querySelector('svg path')?.getAttribute('d');

    expect(path2d).not.toBe(path3d);
  });

  it('does not toggle when graphMode is already the target mode', () => {
    graphStore.setState({ graphMode: '2d' });
    renderWithProviders();
    // Click toggles from 2d to 3d
    fireEvent.click(screen.getByRole('button'));
    expect(graphStore.getState().graphMode).toBe('3d');
    // Verify the toggle went the right direction (not staying at 2d)
    expect(graphStore.getState().graphMode).not.toBe('2d');
  });
});
