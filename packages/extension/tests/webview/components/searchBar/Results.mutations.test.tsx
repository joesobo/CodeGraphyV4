/**
 * Tests targeting surviving mutants in searchBarResults.tsx:
 * - L32:11 StringLiteral: "" ('text-xs' class on the result span)
 * - L45:13 StringLiteral: "" (button className part 1)
 * - L46:13 StringLiteral: "" (button className part 2)
 * - L47:13 StringLiteral: "" (button className part 3)
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SearchBarResults } from '../../../../src/webview/components/searchBar/Results';

describe('SearchBarResults (mutation targets)', () => {
  it('result count span has text-xs class', () => {
    // L32: mutating 'text-xs' to '' would remove this class
    render(
      <SearchBarResults
        value="test"
        showResults={true}
        resultCount={3}
        totalCount={10}
        onClear={vi.fn()}
      />
    );
    const span = screen.getByText('3 of 10');
    expect(span.className).toContain('text-xs');
  });

  it('result count span has error foreground class when regex error exists', () => {
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
    const span = screen.getByText('Invalid regex');
    expect(span.className).toContain('text-xs');
    expect(span.className).toContain('errorForeground');
  });

  it('clear button has rounded hover background styling', () => {
    // L45: tests that the first class string in the button cn() is applied
    render(
      <SearchBarResults
        value="search text"
        showResults={false}
        onClear={vi.fn()}
      />
    );
    const button = screen.getByTitle('Clear search (Escape)');
    // The button should have padding, rounded, and hover background styles
    expect(button.className).toContain('rounded');
    expect(button.className).toContain('p-0.5');
  });

  it('clear button has placeholder foreground text color', () => {
    // L46: tests that the second class string in the button cn() is applied
    render(
      <SearchBarResults
        value="search text"
        showResults={false}
        onClear={vi.fn()}
      />
    );
    const button = screen.getByTitle('Clear search (Escape)');
    expect(button.className).toContain('placeholderForeground');
  });

  it('clear button has hover foreground text color', () => {
    // L47: tests that the third class string in the button cn() is applied
    render(
      <SearchBarResults
        value="search text"
        showResults={false}
        onClear={vi.fn()}
      />
    );
    const button = screen.getByTitle('Clear search (Escape)');
    // The hover text color class should be present
    expect(button.className).toContain('hover:text-');
  });

  it('outer container has absolute positioning and flex layout', () => {
    render(
      <SearchBarResults
        value="test"
        showResults={true}
        resultCount={1}
        totalCount={5}
        onClear={vi.fn()}
      />
    );
    const span = screen.getByText('1 of 5');
    const container = span.parentElement!;
    expect(container.className).toContain('absolute');
    expect(container.className).toContain('flex');
  });
});
