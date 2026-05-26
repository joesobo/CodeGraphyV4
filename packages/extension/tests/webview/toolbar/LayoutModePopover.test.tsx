import React from 'react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { graphStore } from '../../../src/webview/store/state';
import { clearSentMessages, findMessage } from '../../helpers/sentMessages';

vi.mock('../../../src/webview/components/ui/overlay/popover', async () => {
  const React = await import('react');

  function Popover({ children }: React.PropsWithChildren): React.ReactElement {
    return <>{children}</>;
  }

  function PopoverTrigger({
    asChild: _asChild,
    children,
  }: React.PropsWithChildren<{ asChild?: boolean }>): React.ReactElement {
    return React.Children.only(children) as React.ReactElement;
  }

  function PopoverContent({
    align: _align,
    children,
    side: _side,
    ...props
  }: React.PropsWithChildren<{
    align?: string;
    className?: string;
    side?: string;
  }>): React.ReactElement {
    return <div {...props}>{children}</div>;
  }

  return { Popover, PopoverContent, PopoverTrigger };
});

vi.mock('../../../src/webview/components/ui/overlay/tooltip', async () => {
  const React = await import('react');

  function Tooltip({ children }: React.PropsWithChildren): React.ReactElement {
    return <>{children}</>;
  }

  function TooltipTrigger({
    asChild: _asChild,
    children,
  }: React.PropsWithChildren<{ asChild?: boolean }>): React.ReactElement {
    return React.Children.only(children) as React.ReactElement;
  }

  function TooltipContent({
    children,
    side: _side,
    ...props
  }: React.PropsWithChildren<{
    className?: string;
    side?: string;
  }>): React.ReactElement {
    return (
      <div role="tooltip" {...props}>
        {children}
      </div>
    );
  }

  return { Tooltip, TooltipContent, TooltipTrigger };
});

import { LayoutModePopover } from '../../../src/webview/components/toolbar/LayoutModePopover';

describe('webview/toolbar/LayoutModePopover', () => {
  beforeEach(() => {
    clearSentMessages();
    graphStore.setState({ dagMode: null });
  });

  it('labels the trigger with the active layout mode', () => {
    graphStore.setState({ dagMode: 'td' });

    render(<LayoutModePopover />);

    const trigger = screen.getByRole('button', { name: 'Layout: Top Down' });
    expect(trigger).toHaveAttribute('title', 'Layout');
    expect(trigger.className).toContain('h-7');
    expect(trigger.className).toContain('bg-transparent');
  });

  it('falls back to the default layout when the store has an unknown mode', () => {
    graphStore.setState({ dagMode: 'unknown-mode' as never });

    render(<LayoutModePopover />);

    expect(screen.getByRole('button', { name: 'Layout: Default' })).toBeInTheDocument();
  });

  it('marks exactly the active option as pressed', () => {
    graphStore.setState({ dagMode: 'lr' });

    render(<LayoutModePopover />);

    const options = within(screen.getByTestId('layout-mode-popover'));
    const leftToRight = options.getByRole('button', { name: /Left to Right/i });
    const radialOut = options.getByRole('button', { name: /Radial Out/i });
    expect(leftToRight).toHaveAttribute('aria-pressed', 'true');
    expect(leftToRight.className).toContain('bg-[var(--cg-primary-faint)]');
    expect(radialOut).toHaveAttribute('aria-pressed', 'false');
    expect(radialOut.className).not.toContain('bg-[var(--cg-primary-faint)]');
  });

  it('sends the selected layout mode to the extension', () => {
    render(<LayoutModePopover />);

    fireEvent.click(screen.getByRole('button', { name: /Radial Out/i }));

    expect(findMessage('UPDATE_DAG_MODE')?.payload.dagMode).toBe('radialout');
  });
});
