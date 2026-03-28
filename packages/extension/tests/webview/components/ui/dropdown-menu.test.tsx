import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../../src/webview/components/ui/dropdown-menu';

describe('DropdownMenu wrappers', () => {
  it('renders content, item, separator, and label classes', async () => {
    render(
      <DropdownMenu open>
        <DropdownMenuTrigger asChild>
          <button type="button">Actions</button>
        </DropdownMenuTrigger>
        <DropdownMenuContent data-testid="menu-content" className="custom-content">
          <DropdownMenuLabel data-testid="menu-label" inset>
            File
          </DropdownMenuLabel>
          <DropdownMenuItem data-testid="menu-item" inset className="custom-item">
            Rename
          </DropdownMenuItem>
          <DropdownMenuSeparator data-testid="menu-separator" />
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    const content = await screen.findByTestId('menu-content');
    expect(content).toHaveClass(
      'z-50',
      'min-w-[8rem]',
      'overflow-hidden',
      'rounded-md',
      'border',
      'p-1',
      'bg-[var(--vscode-menu-background,#252526)]',
      'text-[var(--vscode-menu-foreground,#cccccc)]',
      'border-[var(--vscode-menu-border,#454545)]',
      'shadow-md',
      'animate-in',
      'fade-in-80',
      'custom-content',
    );
    expect(content.getAttribute('class')).toContain('data-[state=open]:animate-in');
    expect(content.getAttribute('class')).toContain('data-[state=closed]:animate-out');
    expect(content.getAttribute('class')).toContain('data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0');
    expect(content.getAttribute('class')).toContain('data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95');

    const item = screen.getByTestId('menu-item');
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
      'pl-8',
      'custom-item',
    );
    expect(item.getAttribute('class')).toContain('focus:bg-[var(--vscode-list-hoverBackground,#2a2d2e)]');
    expect(item.getAttribute('class')).toContain('focus:text-[var(--vscode-list-hoverForeground)]');
    expect(item.getAttribute('class')).toContain('data-[disabled]:pointer-events-none data-[disabled]:opacity-50');

    expect(screen.getByTestId('menu-separator')).toHaveClass(
      '-mx-1',
      'my-1',
      'h-px',
      'bg-[var(--vscode-menu-separatorBackground,#454545)]',
    );

    expect(screen.getByTestId('menu-label')).toHaveClass(
      'px-2',
      'py-1.5',
      'text-xs',
      'font-semibold',
      'uppercase',
      'tracking-wide',
      'text-[var(--vscode-descriptionForeground,#999999)]',
      'pl-8',
    );
  });
});
