/**
 * @fileoverview Small toggle button for search options (VS Code style).
 * @module webview/components/searchBar/ToggleButton
 */

import React from 'react';
import { cn } from '../ui/cn';

export interface ToggleButtonProps {
  active: boolean;
  onClick: () => void;
  title: string;
  shortcut: string;
  children: React.ReactNode;
  hasError?: boolean;
}

/**
 * Renders a small toggle button styled like VS Code search option toggles.
 */
export function ToggleButton({
  active,
  onClick,
  title,
  shortcut,
  children,
  hasError,
}: ToggleButtonProps): React.ReactElement {
  return (
    <button
      onClick={onClick}
      title={`${title} (${shortcut})`}
      className={cn(
        'px-1.5 py-0.5 text-xs font-medium rounded transition-colors',
        'border',
        active && !hasError && 'bg-[var(--cg-input-option-active-background)] border-[var(--cg-input-option-active-border)] text-[var(--cg-input-option-active-foreground)]',
        !active && !hasError && 'bg-transparent border-transparent text-[var(--cg-input-placeholder)] hover:bg-accent',
        hasError && 'bg-[var(--cg-input-error-background)] border-[var(--cg-input-error-border)] text-[var(--cg-error-foreground)]'
      )}
    >
      {children}
    </button>
  );
}
