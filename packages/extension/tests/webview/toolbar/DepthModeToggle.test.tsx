import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('../../../src/webview/components/ui/overlay/tooltip', async () => {
  return {
    TooltipProvider: ({ children }: React.PropsWithChildren) => <>{children}</>,
    Tooltip: ({ children }: React.PropsWithChildren) => <>{children}</>,
    TooltipTrigger: ({ children }: React.PropsWithChildren<{ asChild?: boolean }>) =>
      React.Children.only(children) as React.ReactElement,
    TooltipContent: ({ children }: React.PropsWithChildren) => (
      <div role="tooltip">{children}</div>
    ),
  };
});

const buttonSpy = vi.fn();
vi.mock('../../../src/webview/components/ui/button', () => ({
  Button: (() => {
    function MockButtonImpl(
      { children, variant, size, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
        variant?: string;
        size?: string;
      },
      ref: React.ForwardedRef<HTMLButtonElement>,
    ) {
      buttonSpy({ variant, size, ...props });

      return (
        <button
          ref={ref}
          data-variant={variant}
          data-size={size}
          {...props}
        >
          {children}
        </button>
      );
    }

    const MockButton = React.forwardRef(MockButtonImpl);
    MockButton.displayName = 'MockButton';
    return MockButton;
  })(),
}));

import { TooltipProvider } from '../../../src/webview/components/ui/overlay/tooltip';
import { graphStore } from '../../../src/webview/store/state';

vi.mock('../../../src/webview/vscodeApi', () => ({
  postMessage: vi.fn(),
}));

import { postMessage } from '../../../src/webview/vscodeApi';
import { DepthModeToggle } from '../../../src/webview/components/toolbar/DepthModeToggle';

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
    buttonSpy.mockClear();
    graphStore.setState({
      depthMode: false,
      graphHasIndex: false,
    });
  });

  it('renders a disabled button before the repo has been indexed', () => {
    renderWithProviders();

    const button = screen.getByTitle('Enable Depth Mode');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'Enable Depth Mode');
    expect(button).toHaveAttribute('data-size', 'icon');
    expect(button).toHaveAttribute('data-variant', 'outline');
    expect(button.className).toContain('h-7');
    expect(button.className).toContain('w-7');
    expect(screen.getByRole('tooltip')).toHaveTextContent('Index the repo to enable depth mode');
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
    expect(screen.getByTitle('Disable Depth Mode')).toHaveAttribute('data-variant', 'default');
    expect(screen.getByTitle('Disable Depth Mode').className).toContain('text-primary-foreground');
  });

  it('uses the inactive button variant while depth mode is disabled', () => {
    graphStore.setState({
      depthMode: false,
      graphHasIndex: true,
    });
    renderWithProviders();

    const button = screen.getByTitle('Enable Depth Mode');
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button.className).toContain('bg-transparent');
    expect(button.className).not.toContain('bg-primary');
  });

  it('does not post messages while the button is disabled', () => {
    renderWithProviders();

    fireEvent.click(screen.getByTitle('Enable Depth Mode'));

    expect(postMessage).not.toHaveBeenCalled();
  });
});
