/**
 * @fileoverview Search bar component for filtering graph nodes.
 * Supports fuzzy search and advanced options: Match Case, Whole Word, Regex.
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { cn } from '../lib/utils';

export interface SearchOptions {
  matchCase: boolean;
  wholeWord: boolean;
  regex: boolean;
}

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  options: SearchOptions;
  onOptionsChange: (options: SearchOptions) => void;
  placeholder?: string;
  className?: string;
  resultCount?: number;
  totalCount?: number;
  regexError?: string | null;
}

interface ToggleButtonProps {
  active: boolean;
  onClick: () => void;
  title: string;
  shortcut: string;
  children: React.ReactNode;
  hasError?: boolean;
}

/**
 * Small toggle button for search options (VS Code style)
 */
function ToggleButton({ active, onClick, title, shortcut, children, hasError }: ToggleButtonProps): React.ReactElement {
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

/**
 * Search bar with VSCode-like styling and advanced search options.
 * Supports Ctrl+F to focus, Escape to clear, and Alt+C/W/R for options.
 */
export function SearchBar({
  value,
  onChange,
  options,
  onOptionsChange,
  placeholder = 'Search files...',
  className,
  resultCount,
  totalCount,
  regexError,
}: SearchBarProps): React.ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);

  const toggleOption = useCallback((key: keyof SearchOptions) => {
    onOptionsChange({ ...options, [key]: !options[key] });
  }, [options, onOptionsChange]);

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

      // Alt+C for Match Case
      if (event.altKey && event.key.toLowerCase() === 'c') {
        event.preventDefault();
        toggleOption('matchCase');
      }

      // Alt+W for Whole Word
      if (event.altKey && event.key.toLowerCase() === 'w') {
        event.preventDefault();
        toggleOption('wholeWord');
      }

      // Alt+R for Regex
      if (event.altKey && event.key.toLowerCase() === 'r') {
        event.preventDefault();
        toggleOption('regex');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onChange, toggleOption]);

  const handleClear = useCallback(() => {
    onChange('');
    inputRef.current?.focus();
  }, [onChange]);

  const showResults = value.length > 0 && resultCount !== undefined && totalCount !== undefined;

  return (
    <div className={cn('relative flex items-center gap-2', className)}>
      {/* Search input container */}
      <div className="relative flex-1 flex items-center">
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
            'border',
            regexError 
              ? 'border-[var(--vscode-inputValidation-errorBorder,#be1100)]' 
              : 'border-[var(--vscode-input-border,#3c3c3c)]',
            'placeholder:text-[var(--vscode-input-placeholderForeground,#6b7280)]',
            'focus:outline-none',
            !regexError && 'focus:border-[var(--vscode-focusBorder,#007fd4)]',
            'transition-colors'
          )}
        />

        {/* Result count & clear button */}
        <div className="absolute right-2 flex items-center gap-2">
          {showResults && (
            <span className={cn(
              'text-xs',
              regexError 
                ? 'text-[var(--vscode-errorForeground,#f48771)]'
                : 'text-[var(--vscode-descriptionForeground,#8c8c8c)]'
            )}>
              {regexError ? 'Invalid regex' : `${resultCount} of ${totalCount}`}
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

      {/* Search option toggles */}
      <div className="flex items-center gap-1">
        <ToggleButton
          active={options.matchCase}
          onClick={() => toggleOption('matchCase')}
          title="Match Case"
          shortcut="Alt+C"
        >
          Aa
        </ToggleButton>
        <ToggleButton
          active={options.wholeWord}
          onClick={() => toggleOption('wholeWord')}
          title="Match Whole Word"
          shortcut="Alt+W"
        >
          Ab
        </ToggleButton>
        <ToggleButton
          active={options.regex}
          onClick={() => toggleOption('regex')}
          title="Use Regular Expression"
          shortcut="Alt+R"
          hasError={!!regexError}
        >
          .*
        </ToggleButton>
      </div>
    </div>
  );
}
