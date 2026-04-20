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

export function formatExcludedCount(count: number): string {
  if (count === 1) {
    return '1 excluded from graph';
  }

  return `${count} excluded from graph`;
}
