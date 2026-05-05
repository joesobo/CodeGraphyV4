import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ScopeTabButton } from '../../../src/webview/components/graphScope/tabs';

describe('ScopeTabButton', () => {
  it('renders the active tab with pressed state and secondary styling', () => {
    render(
      <ScopeTabButton active={true} onClick={vi.fn()}>
        Node Types
      </ScopeTabButton>,
    );

    const button = screen.getByRole('button', { name: 'Node Types' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveClass('bg-secondary');
    expect(button).toHaveClass('h-7');
    expect(button).toHaveClass('flex-1');
    expect(button).toHaveClass('px-2');
    expect(button).toHaveClass('text-xs');
  });

  it('renders inactive tabs with ghost styling and calls the click handler', () => {
    const onClick = vi.fn();
    render(
      <ScopeTabButton active={false} onClick={onClick}>
        Edge Types
      </ScopeTabButton>,
    );

    const button = screen.getByRole('button', { name: 'Edge Types' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).toHaveClass('hover:bg-accent');

    fireEvent.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
