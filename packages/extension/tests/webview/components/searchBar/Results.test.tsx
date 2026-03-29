import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchBarResults } from '../../../../src/webview/components/searchBar/Results';

describe('SearchBarResults', () => {
  it('shows result count when showResults is true', () => {
    render(
      <SearchBarResults
        value="test"
        showResults={true}
        resultCount={5}
        totalCount={100}
        onClear={vi.fn()}
      />
    );
    expect(screen.getByText('5 of 100')).toBeInTheDocument();
  });

  it('does not show result count when showResults is false', () => {
    render(
      <SearchBarResults
        value="test"
        showResults={false}
        resultCount={5}
        totalCount={100}
        onClear={vi.fn()}
      />
    );
    expect(screen.queryByText('5 of 100')).not.toBeInTheDocument();
  });

  it('shows "Invalid regex" when regexError is set and showResults is true', () => {
    render(
      <SearchBarResults
        value="test["
        showResults={true}
        resultCount={0}
        totalCount={10}
        regexError="bad regex"
        onClear={vi.fn()}
      />
    );
    expect(screen.getByText('Invalid regex')).toBeInTheDocument();
  });

  it('shows result count instead of error when regexError is null', () => {
    render(
      <SearchBarResults
        value="test"
        showResults={true}
        resultCount={3}
        totalCount={10}
        regexError={null}
        onClear={vi.fn()}
      />
    );
    expect(screen.getByText('3 of 10')).toBeInTheDocument();
    expect(screen.queryByText('Invalid regex')).not.toBeInTheDocument();
  });

  it('shows clear button when value is non-empty', () => {
    render(
      <SearchBarResults
        value="test"
        showResults={false}
        onClear={vi.fn()}
      />
    );
    expect(screen.getByTitle('Clear search (Escape)')).toBeInTheDocument();
  });

  it('does not show clear button when value is empty', () => {
    render(
      <SearchBarResults
        value=""
        showResults={false}
        onClear={vi.fn()}
      />
    );
    expect(screen.queryByTitle('Clear search (Escape)')).not.toBeInTheDocument();
  });

  it('calls onClear when clear button is clicked', () => {
    const onClear = vi.fn();
    render(
      <SearchBarResults
        value="test"
        showResults={false}
        onClear={onClear}
      />
    );
    fireEvent.click(screen.getByTitle('Clear search (Escape)'));
    expect(onClear).toHaveBeenCalledOnce();
  });

  it('applies error text color when regexError is set', () => {
    render(
      <SearchBarResults
        value="test["
        showResults={true}
        resultCount={0}
        totalCount={10}
        regexError="bad"
        onClear={vi.fn()}
      />
    );
    const errorSpan = screen.getByText('Invalid regex');
    expect(errorSpan.className).toContain('errorForeground');
  });

  it('applies description text color when no regex error', () => {
    render(
      <SearchBarResults
        value="test"
        showResults={true}
        resultCount={5}
        totalCount={20}
        onClear={vi.fn()}
      />
    );
    const resultSpan = screen.getByText('5 of 20');
    expect(resultSpan.className).toContain('descriptionForeground');
  });
});
