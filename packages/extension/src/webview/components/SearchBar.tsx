/**
 * @fileoverview Search bar component for filtering graph nodes.
 */

import React from 'react';
import { cn } from './ui/cn';
import { mdiMagnify } from '@mdi/js';
import { MdiIcon } from './icons';
import { ToggleButton } from './searchBar/ToggleButton';
import { useSearchBarHandlers } from './searchBarHandlers';
import { SearchBarResults } from './searchBarResults';

export type { SearchOptions } from './searchBarTypes';
export type { SearchBarProps } from './searchBarTypes';

import type { SearchBarProps } from './searchBarTypes';

export function SearchBar({
  value, onChange, options, onOptionsChange, placeholder = 'Search files...',
  className, resultCount, totalCount, regexError,
}: SearchBarProps): React.ReactElement {
  const { inputRef, toggleOption, handleClear } = useSearchBarHandlers(options, onOptionsChange, onChange);
  const showResults = value.length > 0 && resultCount !== undefined && totalCount !== undefined;

  return (
    <div className={cn('relative flex items-center gap-2', className)}>
      <div className="relative flex-1 flex items-center">
        <MdiIcon path={mdiMagnify} size={16} className="absolute left-3 text-[var(--vscode-input-placeholderForeground,#6b7280)]" />
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
            regexError ? 'border-[var(--vscode-inputValidation-errorBorder,#be1100)]' : 'border-[var(--vscode-input-border,#3c3c3c)]',
            'placeholder:text-[var(--vscode-input-placeholderForeground,#6b7280)]',
            'focus:outline-none',
            !regexError && 'focus:border-[var(--vscode-focusBorder,#007fd4)]',
            'transition-colors'
          )}
        />
        <SearchBarResults value={value} showResults={showResults} resultCount={resultCount} totalCount={totalCount} regexError={regexError} onClear={handleClear} />
      </div>
      <div className="flex items-center gap-1">
        <ToggleButton active={options.matchCase} onClick={() => toggleOption('matchCase')} title="Match Case" shortcut="Alt+C">Aa</ToggleButton>
        <ToggleButton active={options.wholeWord} onClick={() => toggleOption('wholeWord')} title="Match Whole Word" shortcut="Alt+W">Ab</ToggleButton>
        <ToggleButton active={options.regex} onClick={() => toggleOption('regex')} title="Use Regular Expression" shortcut="Alt+R" hasError={!!regexError}>.*</ToggleButton>
      </div>
    </div>
  );
}
