import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../../../../src/webview/components/ui/overlay/tooltip';

describe('TooltipContent', () => {
  it('renders the default tooltip classes and merged className', async () => {
    render(
      <TooltipProvider>
        <Tooltip open>
          <TooltipTrigger asChild>
            <button type="button">Hover</button>
          </TooltipTrigger>
          <TooltipContent data-testid="tooltip-content" className="custom-tooltip">
            Details
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );

    const content = await screen.findByTestId('tooltip-content');
    expect(content).toHaveTextContent('Details');
    expect(content).toHaveClass(
      'z-50',
      'overflow-hidden',
      'rounded-md',
      'border',
      'border-border',
      'bg-popover',
      'px-3',
      'py-1.5',
      'text-xs',
      'text-popover-foreground',
      'shadow-md',
      'animate-in',
      'origin-[--radix-tooltip-content-transform-origin]',
      'custom-tooltip',
    );
  });
});
