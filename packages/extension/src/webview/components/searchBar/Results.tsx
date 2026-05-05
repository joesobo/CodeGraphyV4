/**
 * @fileoverview Result count and clear button for SearchBar.
 * @module webview/components/searchBar/Results
 */

import React from 'react';
import { cn } from '../ui/cn';
import { mdiClose } from '@mdi/js';
import { MdiIcon } from '../icons/MdiIcon';

interface SearchBarResultsProps {
  value: string;
  showResults: boolean;
  resultCount?: number;
  totalCount?: number;
  regexError?: string | null;
  countLabel?: string | null;
  onClear: () => void;
}

export function SearchBarResults({
  value,
  showResults,
  resultCount,
  totalCount,
  regexError,
  countLabel,
  onClear,
}: SearchBarResultsProps): React.ReactElement {
  return (
    <div className="absolute right-2 flex items-center gap-2">
      {showResults && (
        <span className={cn(
          'text-xs',
          regexError
            ? 'text-[var(--cg-error-foreground)]'
            : 'text-muted-foreground'
        )}>
          {countLabel ?? (regexError ? 'Invalid regex' : `${resultCount} of ${totalCount}`)}
        </span>
      )}

      {value && (
        <button
          onClick={onClear}
          className={cn(
            'p-0.5 rounded hover:bg-accent',
            'text-[var(--cg-input-placeholder)]',
            'hover:text-[var(--cg-input-foreground)]'
          )}
          title="Clear search (Escape)"
        >
          <MdiIcon path={mdiClose} size={16} />
        </button>
      )}
    </div>
  );
}
