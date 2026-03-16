/**
 * @fileoverview Search bar component for filtering graph nodes.
 * Supports fuzzy search and advanced options: Match Case, Whole Word, Regex.
 */

import React, { useRef, useCallback } from 'react';
import { cn } from './ui/cn';
import { mdiMagnify, mdiClose } from '@mdi/js';
import { MdiIcon } from './icons';
import { ToggleButton } from './searchBar/ToggleButton';
import { useSearchKeyboard } from './useSearchKeyboard';

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

  useSearchKeyboard({ inputRef, onChange, toggleOption });

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
        <MdiIcon path={mdiMagnify} size={16} className="absolute left-3 text-[var(--vscode-input-placeholderForeground,#6b7280)]" />

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
              <MdiIcon path={mdiClose} size={16} />
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
