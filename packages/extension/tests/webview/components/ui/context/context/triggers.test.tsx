import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@radix-ui/react-context-menu', () => import('../../contextMenuPrimitivesMock'));

import {
  ContextMenuContent,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from '../../../../../../src/webview/components/ui/context/triggers';

describe('ContextMenu trigger wrappers', () => {
  it('renders the sub-trigger classes, inset padding, and chevron', () => {
    render(
      <ContextMenuSubTrigger data-testid="sub-trigger" inset className="custom-trigger">
        Layout
      </ContextMenuSubTrigger>,
    );

    expect(screen.getByTestId('sub-trigger')).toHaveClass(
      'flex',
      'cursor-default',
      'select-none',
      'items-center',
      'rounded-sm',
      'px-2',
      'py-1.5',
      'text-sm',
      'outline-none',
      'focus:bg-[var(--cg-list-hover-background)]',
      'focus:text-[var(--cg-list-hover-foreground)]',
      'data-[state=open]:bg-[var(--cg-list-hover-background)]',
      'pl-8',
      'custom-trigger',
    );
    expect(screen.getByText('▶')).toBeInTheDocument();
  });

  it('renders the sub-content classes', () => {
    render(
      <ContextMenuSubContent data-testid="sub-content" className="custom-sub-content">
        Nested
      </ContextMenuSubContent>,
    );

    expect(screen.getByTestId('sub-content')).toHaveClass(
      'z-50',
      'min-w-[8rem]',
      'overflow-hidden',
      'rounded-md',
      'border',
      'p-1',
      'bg-[var(--cg-menu-background)]',
      'text-[var(--cg-menu-foreground)]',
      'border-[var(--cg-menu-border)]',
      'shadow-md',
      'data-[state=open]:animate-in',
      'data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-0',
      'data-[state=open]:fade-in-0',
      'data-[state=closed]:zoom-out-95',
      'data-[state=open]:zoom-in-95',
      'custom-sub-content',
    );
  });

  it('renders the content classes through the portal wrapper', () => {
    render(
      <ContextMenuContent data-testid="content" className="custom-content">
        Root menu
      </ContextMenuContent>,
    );

    expect(screen.getByTestId('content')).toHaveClass(
      'z-50',
      'min-w-[8rem]',
      'overflow-hidden',
      'rounded-md',
      'border',
      'p-1',
      'bg-[var(--cg-menu-background)]',
      'text-[var(--cg-menu-foreground)]',
      'border-[var(--cg-menu-border)]',
      'shadow-md',
      'animate-in',
      'fade-in-80',
      'data-[state=open]:animate-in',
      'data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-0',
      'data-[state=open]:fade-in-0',
      'data-[state=closed]:zoom-out-95',
      'data-[state=open]:zoom-in-95',
      'custom-content',
    );
  });
});
