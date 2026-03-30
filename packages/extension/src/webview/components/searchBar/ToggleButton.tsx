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
        active && !hasError && 'bg-[var(--vscode-inputOption-activeBackground,#007fd4)] border-[var(--vscode-inputOption-activeBorder,#007fd4)] text-[var(--vscode-inputOption-activeForeground,#ffffff)]',
        !active && !hasError && 'bg-transparent border-transparent text-[var(--vscode-input-placeholderForeground,#6b7280)] hover:bg-[var(--vscode-toolbar-hoverBackground,#5a5d5e)]',
        hasError && 'bg-[var(--vscode-inputValidation-errorBackground,#5a1d1d)] border-[var(--vscode-inputValidation-errorBorder,#be1100)] text-[var(--vscode-errorForeground,#f48771)]'
      )}
    >
      {children}
    </button>
  );
}
