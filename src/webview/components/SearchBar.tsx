/**
 * @fileoverview Search bar component for filtering graph nodes.
 * Uses fuzzy search to match file names and paths.
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { cn } from '../lib/utils';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  resultCount?: number;
  totalCount?: number;
}

/**
 * Search bar with VSCode-like styling.
 * Supports Ctrl+F to focus and Escape to clear.
 */
export function SearchBar({
  value,
  onChange,
  placeholder = 'Search files...',
  className,
  resultCount,
  totalCount,
}: SearchBarProps): React.ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + F to focus search
      if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
      
      // Escape to clear search (when focused)
      if (event.key === 'Escape' && document.activeElement === inputRef.current) {
        event.preventDefault();
        onChange('');
        inputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onChange]);

  const handleClear = useCallback(() => {
    onChange('');
    inputRef.current?.focus();
  }, [onChange]);

  const showResults = value.length > 0 && resultCount !== undefined && totalCount !== undefined;

  return (
    <div className={cn('relative flex items-center', className)}>
      {/* Search icon */}
      <svg
        className="absolute left-3 w-4 h-4 text-[var(--vscode-input-placeholderForeground,#6b7280)]"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>

      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full pl-10 pr-20 py-1.5 rounded-md text-sm',
          'bg-[var(--vscode-input-background,#3c3c3c)]',
          'text-[var(--vscode-input-foreground,#cccccc)]',
          'border border-[var(--vscode-input-border,#3c3c3c)]',
          'placeholder:text-[var(--vscode-input-placeholderForeground,#6b7280)]',
          'focus:outline-none focus:border-[var(--vscode-focusBorder,#007fd4)]',
          'transition-colors'
        )}
      />

      {/* Result count & clear button */}
      <div className="absolute right-2 flex items-center gap-2">
        {showResults && (
          <span className="text-xs text-[var(--vscode-descriptionForeground,#8c8c8c)]">
            {resultCount} of {totalCount}
          </span>
        )}
        
        {value && (
          <button
            onClick={handleClear}
            className={cn(
              'p-0.5 rounded hover:bg-[var(--vscode-toolbar-hoverBackground,#5a5d5e)]',
              'text-[var(--vscode-input-placeholderForeground,#6b7280)]',
              'hover:text-[var(--vscode-input-foreground,#cccccc)]'
            )}
            title="Clear search (Escape)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
