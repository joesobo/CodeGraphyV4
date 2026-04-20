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
            ? 'text-[var(--vscode-errorForeground,#f48771)]'
            : 'text-[var(--vscode-descriptionForeground,#8c8c8c)]'
        )}>
          {countLabel ?? (regexError ? 'Invalid regex' : `${resultCount} of ${totalCount}`)}
        </span>
      )}

      {value && (
        <button
          onClick={onClear}
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
  );
}
