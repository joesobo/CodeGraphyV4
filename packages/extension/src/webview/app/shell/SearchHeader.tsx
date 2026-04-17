import React from 'react';
import { SearchBar } from '../../components/searchBar/Field';
import { ActiveFileBreadcrumb } from '../../components/activeFileBreadcrumb/view';
import type { SearchOptions } from '../../components/searchBar/field/model';

export interface SearchHeaderProps {
  searchQuery: string;
  searchOptions: SearchOptions;
  resultCount: number | undefined;
  totalCount: number;
  activeFilePath: string | null;
  regexError: string | null;
  onSearchQueryChange: (value: string) => void;
  onSearchOptionsChange: (options: SearchOptions) => void;
}

export function SearchHeader({
  searchQuery,
  searchOptions,
  resultCount,
  totalCount,
  activeFilePath,
  regexError,
  onSearchQueryChange,
  onSearchOptionsChange,
}: SearchHeaderProps): React.ReactElement {
  return (
    <div className="flex-shrink-0 p-2 border-b border-[var(--vscode-panel-border,#3c3c3c)]">
      <SearchBar
        value={searchQuery}
        onChange={onSearchQueryChange}
        options={searchOptions}
        onOptionsChange={onSearchOptionsChange}
        resultCount={resultCount}
        totalCount={totalCount}
        placeholder="Search files... (Ctrl+F)"
        regexError={regexError}
      />
      <div className="mt-1.5 min-h-5">
        <ActiveFileBreadcrumb filePath={activeFilePath} />
      </div>
    </div>
  );
}
