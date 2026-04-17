import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SearchHeader } from '../../../../../src/webview/app/shell/panel/search';

vi.mock('../../../../../src/webview/components/searchBar/Field', () => ({
  SearchBar: ({
    value,
    resultCount,
    totalCount,
    regexError,
  }: {
    value: string;
    resultCount: number | undefined;
    totalCount: number;
    regexError: string | null;
  }) => (
    <div
      data-testid="search-bar"
      data-value={value}
      data-result-count={String(resultCount ?? '')}
      data-total-count={String(totalCount)}
      data-regex-error={String(regexError ?? '')}
    />
  ),
}));

describe('app/SearchHeader', () => {
  it('renders search state and the active breadcrumb', () => {
    render(
      <SearchHeader
        searchQuery="App"
        searchOptions={{ matchCase: false, wholeWord: false, regex: false }}
        resultCount={1}
        totalCount={2}
        activeFilePath="src/App.ts"
        regexError={null}
        onSearchQueryChange={() => {}}
        onSearchOptionsChange={() => {}}
      />,
    );

    expect(screen.getByTestId('search-bar')).toHaveAttribute('data-value', 'App');
    expect(screen.getByTestId('search-bar')).toHaveAttribute('data-result-count', '1');
    expect(screen.getByRole('button', { name: 'Open src/App.ts' })).toBeInTheDocument();
  });
});
