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

import { NodeSizeToggle } from '../../../../src/webview/components/toolbar/NodeSizeToggle';
import { graphStore } from '../../../../src/webview/store/state';
import { clearSentMessages, findMessage } from '../../../helpers/sentMessages';

function setDefaultState(nodeSizeMode: 'connections' | 'file-size' | 'access-count' | 'uniform' = 'connections'): void {
  graphStore.setState({ nodeSizeMode });
}

describe('toolbar/NodeSizeToggle', () => {
  beforeEach(() => {
    clearSentMessages();
    setDefaultState();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders every node size option with its tooltip label', () => {
    render(<NodeSizeToggle />);

    const buttons = screen.getAllByRole('button');
    const tooltips = screen.getAllByRole('tooltip');

    expect(buttons).toHaveLength(4);
    expect(tooltips.map(node => node.textContent)).toEqual([
      'Size by Connections',
      'Size by File Size',
      'Size by Access Count',
      'Uniform Size',
    ]);
    buttons.forEach(button => {
      expect(button).toHaveClass('h-7', 'w-7');
    });
  });

  it('marks only the active node size mode button as default', () => {
    setDefaultState('access-count');

    render(<NodeSizeToggle />);

    const buttons = screen.getAllByRole('button');

    expect(buttons[0]).toHaveClass('hover:bg-accent');
    expect(buttons[1]).toHaveClass('hover:bg-accent');
    expect(buttons[2]).not.toHaveClass('hover:bg-accent');
    expect(buttons[3]).toHaveClass('hover:bg-accent');
  });

  it('posts the selected node size mode when a different option is clicked', () => {
    render(<NodeSizeToggle />);

    fireEvent.click(screen.getAllByRole('button')[1]);

    expect(findMessage('UPDATE_NODE_SIZE_MODE')).toEqual({
      payload: { nodeSizeMode: 'file-size' },
      type: 'UPDATE_NODE_SIZE_MODE',
    });
  });

  it('posts the uniform node size mode when the last option is clicked', () => {
    setDefaultState('connections');

    render(<NodeSizeToggle />);

    fireEvent.click(screen.getAllByRole('button')[3]);

    expect(findMessage('UPDATE_NODE_SIZE_MODE')).toEqual({
      payload: { nodeSizeMode: 'uniform' },
      type: 'UPDATE_NODE_SIZE_MODE',
    });
  });
});
