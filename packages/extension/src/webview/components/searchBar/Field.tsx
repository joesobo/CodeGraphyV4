/**
 * @fileoverview Search bar component for filtering graph nodes.
 */

/**
 * @fileoverview Search bar component for filtering graph nodes.
 * @module webview/components/searchBar/Field
 */

import React from 'react';
import { cn } from '../ui/cn';
import { mdiMagnify } from '@mdi/js';
import { MdiIcon } from '../icons/MdiIcon';
import { ToggleButton } from './ToggleButton';
import { useSearchBarHandlers } from './field/handlers';
import { SearchBarResults } from './Results';
import { FilterPopover } from './filters/popover';

import type { SearchBarProps } from './field/model';

export type { SearchOptions, SearchBarProps } from './field/model';

export function SearchBar({
  value, onChange, options, onOptionsChange, placeholder = 'Search files...',
  className, resultCount, totalCount, regexError, countLabel, filterPopover,
}: SearchBarProps): React.ReactElement {
  const { inputRef, toggleOption, handleClear } = useSearchBarHandlers(options, onOptionsChange, onChange);
  const showResults = Boolean(countLabel) || (value.length > 0 && resultCount !== undefined && totalCount !== undefined);

  return (
    <div className={cn('relative flex items-center gap-2', className)}>
      <div className="relative flex-1 flex items-center">
        <MdiIcon path={mdiMagnify} size={16} className="absolute left-3 text-[var(--cg-input-placeholder)]" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            'w-full pl-10 pr-32 py-1.5 rounded-md text-sm',
            'bg-input',
            'text-[var(--cg-input-foreground)]',
            'border',
            regexError ? 'border-[var(--cg-input-error-border)]' : 'border-[var(--cg-input-border)]',
            'placeholder:text-[var(--cg-input-placeholder)]',
            'focus:outline-none',
            !regexError && 'focus:border-[var(--cg-focus-border)]',
            'transition-colors'
          )}
        />
        <SearchBarResults
          value={value}
          showResults={showResults}
          resultCount={resultCount}
          totalCount={totalCount}
          regexError={regexError}
          countLabel={countLabel}
          onClear={handleClear}
        />
      </div>
      <div className="flex items-center gap-1">
        <ToggleButton active={options.matchCase} onClick={() => toggleOption('matchCase')} title="Match Case" shortcut="Alt+C">Aa</ToggleButton>
        <ToggleButton active={options.wholeWord} onClick={() => toggleOption('wholeWord')} title="Match Whole Word" shortcut="Alt+W">Ab</ToggleButton>
        <ToggleButton active={options.regex} onClick={() => toggleOption('regex')} title="Use Regular Expression" shortcut="Alt+R" hasError={!!regexError}>.*</ToggleButton>
        {filterPopover && <FilterPopover {...filterPopover} />}
      </div>
    </div>
  );
}
