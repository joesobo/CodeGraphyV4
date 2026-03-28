import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@radix-ui/react-context-menu', () => import('./contextMenuPrimitivesMock'));

import {
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
} from '../../../../src/webview/components/ui/context-menu-layout';

describe('ContextMenu layout wrappers', () => {
  it('renders the label classes and inset padding', () => {
    render(
      <ContextMenuLabel data-testid="label" inset className="custom-label">
        Node actions
      </ContextMenuLabel>,
    );

    expect(screen.getByTestId('label')).toHaveClass(
      'px-2',
      'py-1.5',
      'text-sm',
      'font-semibold',
      'text-[var(--vscode-descriptionForeground,#8c8c8c)]',
      'pl-8',
      'custom-label',
    );
  });

  it('renders the separator classes', () => {
    render(<ContextMenuSeparator data-testid="separator" className="custom-separator" />);

    expect(screen.getByTestId('separator')).toHaveClass(
      '-mx-1',
      'my-1',
      'h-px',
      'bg-[var(--vscode-menu-separatorBackground,#454545)]',
      'custom-separator',
    );
  });

  it('renders the shortcut classes', () => {
    render(
      <ContextMenuShortcut data-testid="shortcut" className="custom-shortcut">
        Ctrl+K
      </ContextMenuShortcut>,
    );

    expect(screen.getByTestId('shortcut')).toHaveTextContent('Ctrl+K');
    expect(screen.getByTestId('shortcut')).toHaveClass(
      'ml-auto',
      'text-xs',
      'tracking-widest',
      'text-[var(--vscode-descriptionForeground,#8c8c8c)]',
      'custom-shortcut',
    );
  });
});
