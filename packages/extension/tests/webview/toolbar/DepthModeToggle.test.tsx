import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TooltipProvider } from '../../../src/webview/components/ui/overlay/tooltip';
import { graphStore } from '../../../src/webview/store/state';

vi.mock('../../../src/webview/vscodeApi', () => ({
  postMessage: vi.fn(),
}));

import { postMessage } from '../../../src/webview/vscodeApi';
import {
  DepthModeToggle,
  isDepthModeActive,
} from '../../../src/webview/components/toolbar/DepthModeToggle';

function renderWithProviders() {
  return render(
    <TooltipProvider>
      <DepthModeToggle />
    </TooltipProvider>,
  );
}

describe('DepthModeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    graphStore.setState({
      depthMode: false,
      graphHasIndex: false,
    });
  });

  it('renders a disabled button before the repo has been indexed', () => {
    renderWithProviders();

    expect(screen.getByTitle('Enable Depth Mode')).toBeDisabled();
  });

  it('enables depth mode when clicked after indexing', () => {
    graphStore.setState({ graphHasIndex: true });
    renderWithProviders();

    fireEvent.click(screen.getByTitle('Enable Depth Mode'));

    expect(postMessage).toHaveBeenCalledWith({
      type: 'UPDATE_DEPTH_MODE',
      payload: { depthMode: true },
    });
  });

  it('disables depth mode when clicked while already active', () => {
    graphStore.setState({
      depthMode: true,
      graphHasIndex: true,
    });
    renderWithProviders();

    fireEvent.click(screen.getByTitle('Disable Depth Mode'));

    expect(postMessage).toHaveBeenCalledWith({
      type: 'UPDATE_DEPTH_MODE',
      payload: { depthMode: false },
    });
  });

  it('uses the active button variant while depth mode is enabled', () => {
    graphStore.setState({
      depthMode: true,
      graphHasIndex: true,
    });
    renderWithProviders();

    expect(screen.getByTitle('Disable Depth Mode').className).toContain('hover:bg-primary/90');
  });
});

describe('isDepthModeActive', () => {
  it('returns the depth-mode flag', () => {
    expect(isDepthModeActive(true)).toBe(true);
    expect(isDepthModeActive(false)).toBe(false);
  });
});
