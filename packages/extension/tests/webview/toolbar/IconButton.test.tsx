import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { mdiAutorenew } from '@mdi/js';
import { TooltipProvider } from '../../../src/webview/components/ui/overlay/tooltip';
import { ToolbarIconButton } from '../../../src/webview/components/toolbar/IconButton';

describe('webview/toolbar/IconButton', () => {
  it('renders a titled icon button and forwards clicks', () => {
    const onClick = vi.fn();

    render(
      <TooltipProvider>
        <ToolbarIconButton iconPath={mdiAutorenew} onClick={onClick} title="Refresh" />
      </TooltipProvider>,
    );

    fireEvent.click(screen.getByTitle('Refresh'));
    expect(onClick).toHaveBeenCalledTimes(1);
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
