import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { mdiAutorenew } from '@mdi/js';
import { TooltipProvider } from '../../../src/webview/components/ui/overlay/tooltip';
import { ToolbarIconButton } from '../../../src/webview/components/toolbar/IconButton';

describe('webview/toolbar/IconButton', () => {
  it('renders a titled icon button and forwards clicks', () => {
    const onClick = vi.fn();

    const { container } = render(
      <TooltipProvider>
        <ToolbarIconButton iconPath={mdiAutorenew} onClick={onClick} title="Refresh" />
      </TooltipProvider>,
    );

    const button = screen.getByTitle('Refresh');
    expect(button).not.toHaveAttribute('aria-pressed');
    expect(button).not.toBeDisabled();
    expect(button.className).toContain('relative');
    expect(button.className).not.toContain('border-[var(--cg-primary-ring)]');
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();

    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('marks active buttons as pressed and shows the active rail treatment', () => {
    render(
      <TooltipProvider>
        <ToolbarIconButton active iconPath={mdiAutorenew} onClick={vi.fn()} title="Refresh" />
      </TooltipProvider>,
    );

    const button = screen.getByTitle('Refresh');
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button.className).toContain('border-[var(--cg-primary-ring)]');
    expect(button.className).toContain('bg-[var(--cg-primary-faint)]');
    expect(button.className).toContain('before:absolute');
  });

  it('shows a status dot only when requested', () => {
    const { container } = render(
      <TooltipProvider>
        <ToolbarIconButton statusDot iconPath={mdiAutorenew} onClick={vi.fn()} title="Refresh" />
      </TooltipProvider>,
    );

    const statusDot = container.querySelector('[aria-hidden="true"]');
    expect(statusDot).toBeInTheDocument();
    expect(statusDot?.className).toContain('bg-[var(--cg-warning)]');
  });

  it('passes through the disabled state', () => {
    render(
      <TooltipProvider>
        <ToolbarIconButton disabled iconPath={mdiAutorenew} onClick={vi.fn()} title="Refresh" />
      </TooltipProvider>,
    );

    expect(screen.getByTitle('Refresh')).toBeDisabled();
  });
});
