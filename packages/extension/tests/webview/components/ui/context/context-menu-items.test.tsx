import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@radix-ui/react-context-menu', () => import('../contextMenuPrimitivesMock'));

import {
  ContextMenuCheckboxItem,
  ContextMenuItem,
  ContextMenuRadioItem,
} from '../../../../../src/webview/components/ui/context/items';

describe('ContextMenu item wrappers', () => {
  it('renders item classes for inset and destructive items', () => {
    render(
      <ContextMenuItem data-testid="item" inset destructive className="custom-item">
        Delete
      </ContextMenuItem>,
    );

    const item = screen.getByTestId('item');
    expect(item).toHaveClass(
      'relative',
      'flex',
      'cursor-default',
      'select-none',
      'items-center',
      'rounded-sm',
      'px-2',
      'py-1.5',
      'text-sm',
      'outline-none',
      'data-[disabled]:pointer-events-none',
      'data-[disabled]:opacity-50',
      'text-red-400',
      'focus:text-red-300',
      'pl-8',
      'custom-item',
    );
    expect(item.getAttribute('class')).toContain('focus:bg-[var(--vscode-list-hoverBackground,#2a2d2e)]');
  });

  it('keeps the base focus text color for non-destructive items', () => {
    render(
      <ContextMenuItem data-testid="base-item">
        Open
      </ContextMenuItem>,
    );

    expect(screen.getByTestId('base-item').getAttribute('class')).toContain(
      'focus:text-[var(--vscode-list-hoverForeground)]',
    );
  });

  it('renders the checkbox indicator and forwards checked state', () => {
    render(
      <ContextMenuCheckboxItem data-testid="checkbox" checked={true}>
        Pin
      </ContextMenuCheckboxItem>,
    );

    const checkbox = screen.getByTestId('checkbox');
    expect(checkbox).toHaveAttribute('data-checked', 'true');
    expect(checkbox).toHaveClass(
      'relative',
      'flex',
      'cursor-default',
      'select-none',
      'items-center',
      'rounded-sm',
      'py-1.5',
      'pl-8',
      'pr-2',
      'text-sm',
      'outline-none',
      'focus:bg-[var(--vscode-list-hoverBackground)]',
      'focus:text-[var(--vscode-list-hoverForeground)]',
      'data-[disabled]:pointer-events-none',
      'data-[disabled]:opacity-50',
    );
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('renders the radio indicator', () => {
    render(
      <ContextMenuRadioItem data-testid="radio" value="graph">
        Graph
      </ContextMenuRadioItem>,
    );

    expect(screen.getByTestId('radio')).toHaveClass(
      'relative',
      'flex',
      'cursor-default',
      'select-none',
      'items-center',
      'rounded-sm',
      'py-1.5',
      'pl-8',
      'pr-2',
      'text-sm',
      'outline-none',
      'focus:bg-[var(--vscode-list-hoverBackground)]',
      'focus:text-[var(--vscode-list-hoverForeground)]',
      'data-[disabled]:pointer-events-none',
      'data-[disabled]:opacity-50',
    );
    expect(screen.getByText('●')).toBeInTheDocument();
  });
});
