import { render, screen, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../src/webview/components/ui/overlay/tooltip', async () => {
  const React = await import('react');

  function TooltipProvider({ children }: React.PropsWithChildren): React.ReactElement {
    return <>{children}</>;
  }

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
    ...props
  }: React.PropsWithChildren<Record<string, unknown>>): React.ReactElement {
    return (
      <div role="tooltip" {...props}>
        {children}
      </div>
    );
  }

  return { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
});

import { DagModeToggle } from '../../../../src/webview/components/toolbar/DagModeToggle';
import { graphStore } from '../../../../src/webview/store/state';
import { clearSentMessages, findMessage } from '../../../helpers/sentMessages';

function setDefaultState(dagMode: 'radialout' | 'td' | 'lr' | null = null): void {
  graphStore.setState({ dagMode });
}

describe('toolbar/DagModeToggle', () => {
  beforeEach(() => {
    clearSentMessages();
    setDefaultState();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders every DAG mode button with its tooltip label', () => {
    render(<DagModeToggle />);

    const buttons = screen.getAllByRole('button');
    const tooltips = screen.getAllByRole('tooltip');

    expect(buttons).toHaveLength(4);
    expect(tooltips.map(node => node.textContent)).toEqual([
      'Default',
      'Radial Out',
      'Top Down',
      'Left to Right',
    ]);
    buttons.forEach(button => {
      expect(button).toHaveClass('h-7', 'w-7');
    });
  });

  it('marks only the active DAG mode button as default', () => {
    setDefaultState('td');

    render(<DagModeToggle />);

    const buttons = screen.getAllByRole('button');

    expect(buttons[0]).toHaveClass('hover:bg-accent');
    expect(buttons[1]).toHaveClass('hover:bg-accent');
    expect(buttons[2]).not.toHaveClass('hover:bg-accent');
    expect(buttons[3]).toHaveClass('hover:bg-accent');
  });

  it('posts the selected DAG mode when a non-default option is clicked', () => {
    render(<DagModeToggle />);

    fireEvent.click(screen.getAllByRole('button')[1]);

    expect(findMessage('UPDATE_DAG_MODE')).toEqual({
      payload: { dagMode: 'radialout' },
      type: 'UPDATE_DAG_MODE',
    });
  });

  it('posts a null DAG mode when the default option is clicked', () => {
    setDefaultState('lr');

    render(<DagModeToggle />);

    fireEvent.click(screen.getAllByRole('button')[0]);

    expect(findMessage('UPDATE_DAG_MODE')).toEqual({
      payload: { dagMode: null },
      type: 'UPDATE_DAG_MODE',
    });
  });
});
