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
      activeViewId: 'codegraphy.connections',
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
      type: 'CHANGE_VIEW',
      payload: { viewId: 'codegraphy.depth-graph' },
    });
  });

  it('disables depth mode when clicked while already active', () => {
    graphStore.setState({
      activeViewId: 'codegraphy.depth-graph',
      graphHasIndex: true,
    });
    renderWithProviders();

    fireEvent.click(screen.getByTitle('Disable Depth Mode'));

    expect(postMessage).toHaveBeenCalledWith({
      type: 'CHANGE_VIEW',
      payload: { viewId: 'codegraphy.connections' },
    });
  });

  it('uses the active button variant while depth mode is enabled', () => {
    graphStore.setState({
      activeViewId: 'codegraphy.depth-graph',
      graphHasIndex: true,
    });
    renderWithProviders();

    expect(screen.getByTitle('Disable Depth Mode').className).toContain('hover:bg-primary/90');
  });
});

describe('isDepthModeActive', () => {
  it('returns true only for the depth graph view', () => {
    expect(isDepthModeActive('codegraphy.depth-graph')).toBe(true);
    expect(isDepthModeActive('codegraphy.connections')).toBe(false);
    expect(isDepthModeActive('codegraphy.folder')).toBe(false);
  });
});
