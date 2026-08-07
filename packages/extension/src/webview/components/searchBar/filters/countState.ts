import type { WorkspaceFilterAccounting } from '@codegraphy-dev/core';

export interface FilterCountInput {
  excludedCount: number;
  filterVisibleCount: number;
  regexError?: string | null;
  resultCount?: number;
  searchActive: boolean;
  totalCount: number;
}

export type FilterCountState =
  | { kind: 'invalid-regex'; label: string }
  | { kind: 'search-and-filters'; label: string }
  | { kind: 'search-only'; label: string }
  | { kind: 'filters-only'; label: string }
  | { kind: 'idle'; label: null };

export function getFilterCountState({
  excludedCount,
  filterVisibleCount,
  regexError,
  resultCount,
  searchActive,
  totalCount,
}: FilterCountInput): FilterCountState {
  if (regexError) {
    return { kind: 'invalid-regex', label: 'Invalid regex' };
  }

  const filtersActive = excludedCount > 0;

  if (searchActive && filtersActive && resultCount !== undefined) {
    return { kind: 'search-and-filters', label: `${resultCount} of ${filterVisibleCount}` };
  }

  if (searchActive && resultCount !== undefined) {
    return { kind: 'search-only', label: `${resultCount} of ${totalCount}` };
  }

  if (filtersActive) {
    return { kind: 'filters-only', label: `${filterVisibleCount} of ${totalCount}` };
  }

  return { kind: 'idle', label: null };
}

export function formatExcludedFileCount(accounting: WorkspaceFilterAccounting): string {
  if (accounting.kind === 'unavailable') {
    return 'Before analysis: re-index to calculate excluded workspace files';
  }

  const count = accounting.excludedFileCount;
  if (count === 1) {
    return 'Before analysis: 1 workspace file excluded';
  }

  return `Before analysis: ${count} workspace files excluded`;
}

export function formatExcludedNodeCount(count: number): string {
  if (count === 1) {
    return 'In Graph View: 1 Node excluded';
  }

  return `In Graph View: ${count} Nodes excluded`;
}
