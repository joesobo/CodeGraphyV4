import { describe, expect, it } from 'vitest';
import { getFilterCountState } from '../../../../src/webview/components/searchBar/filters/countState';

describe('searchBar/filters/countState', () => {
  it('uses regex error language before any count language', () => {
    expect(getFilterCountState({
      excludedCount: 3,
      filterVisibleCount: 7,
      regexError: 'bad regex',
      resultCount: 2,
      searchActive: true,
      totalCount: 10,
    })).toEqual({ kind: 'invalid-regex', label: 'Invalid regex' });
  });

  it('uses search-with-filter count language when both are active', () => {
    expect(getFilterCountState({
      excludedCount: 3,
      filterVisibleCount: 7,
      resultCount: 2,
      searchActive: true,
      totalCount: 10,
    })).toEqual({ kind: 'search-and-filters', label: '2 of 7' });
  });

  it('uses search-only count language without active filters', () => {
    expect(getFilterCountState({
      excludedCount: 0,
      filterVisibleCount: 10,
      resultCount: 2,
      searchActive: true,
      totalCount: 10,
    })).toEqual({ kind: 'search-only', label: '2 of 10' });
  });

  it('uses filters-only count language without search', () => {
    expect(getFilterCountState({
      excludedCount: 3,
      filterVisibleCount: 7,
      searchActive: false,
      totalCount: 10,
    })).toEqual({ kind: 'filters-only', label: '7 of 10' });
  });

  it('hides count language when idle', () => {
    expect(getFilterCountState({
      excludedCount: 0,
      filterVisibleCount: 10,
      searchActive: false,
      totalCount: 10,
    })).toEqual({ kind: 'idle', label: null });
  });
});
