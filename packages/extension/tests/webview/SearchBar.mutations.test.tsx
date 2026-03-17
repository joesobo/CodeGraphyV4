import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchBar } from '../../src/webview/components/SearchBar';
import type { SearchOptions } from '../../src/webview/components/searchBarTypes';

describe('SearchBar (mutation targets)', () => {
  const defaultOptions: SearchOptions = {
    matchCase: false,
    wholeWord: false,
    regex: false,
  };

  const mockOnChange = vi.fn();
  const mockOnOptionsChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses default placeholder when not specified', () => {
    render(
      <SearchBar
        value=""
        onChange={mockOnChange}
        options={defaultOptions}
        onOptionsChange={mockOnOptionsChange}
      />
    );
    expect(screen.getByPlaceholderText('Search files...')).toBeInTheDocument();
  });

  it('uses custom placeholder when specified', () => {
    render(
      <SearchBar
        value=""
        onChange={mockOnChange}
        options={defaultOptions}
        onOptionsChange={mockOnOptionsChange}
        placeholder="Custom..."
      />
    );
    expect(screen.getByPlaceholderText('Custom...')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <SearchBar
        value=""
        onChange={mockOnChange}
        options={defaultOptions}
        onOptionsChange={mockOnOptionsChange}
        className="my-custom-class"
      />
    );
    expect(container.firstElementChild?.className).toContain('my-custom-class');
  });

  it('does not show results when value is empty', () => {
    render(
      <SearchBar
        value=""
        onChange={mockOnChange}
        options={defaultOptions}
        onOptionsChange={mockOnOptionsChange}
        resultCount={5}
        totalCount={100}
      />
    );
    expect(screen.queryByText('5 of 100')).not.toBeInTheDocument();
  });

  it('does not show results when resultCount is undefined', () => {
    render(
      <SearchBar
        value="test"
        onChange={mockOnChange}
        options={defaultOptions}
        onOptionsChange={mockOnOptionsChange}
        totalCount={100}
      />
    );
    expect(screen.queryByText(/of 100/)).not.toBeInTheDocument();
  });

  it('does not show results when totalCount is undefined', () => {
    render(
      <SearchBar
        value="test"
        onChange={mockOnChange}
        options={defaultOptions}
        onOptionsChange={mockOnOptionsChange}
        resultCount={5}
      />
    );
    expect(screen.queryByText(/5 of/)).not.toBeInTheDocument();
  });

  it('shows results when value, resultCount, and totalCount are all provided', () => {
    render(
      <SearchBar
        value="test"
        onChange={mockOnChange}
        options={defaultOptions}
        onOptionsChange={mockOnOptionsChange}
        resultCount={3}
        totalCount={50}
      />
    );
    expect(screen.getByText('3 of 50')).toBeInTheDocument();
  });

  it('applies error border class when regexError is set', () => {
    render(
      <SearchBar
        value="test["
        onChange={mockOnChange}
        options={{ ...defaultOptions, regex: true }}
        onOptionsChange={mockOnOptionsChange}
        regexError="Invalid regex"
        resultCount={0}
        totalCount={10}
      />
    );
    const input = screen.getByRole('textbox');
    expect(input.className).toContain('inputValidation-errorBorder');
  });

  it('applies normal border class when no regex error', () => {
    render(
      <SearchBar
        value=""
        onChange={mockOnChange}
        options={defaultOptions}
        onOptionsChange={mockOnOptionsChange}
      />
    );
    const input = screen.getByRole('textbox');
    expect(input.className).not.toContain('inputValidation-errorBorder');
  });

  it('does not show clear button when value is empty', () => {
    render(
      <SearchBar
        value=""
        onChange={mockOnChange}
        options={defaultOptions}
        onOptionsChange={mockOnOptionsChange}
      />
    );
    expect(screen.queryByTitle('Clear search (Escape)')).not.toBeInTheDocument();
  });

  it('shows clear button when value is non-empty', () => {
    render(
      <SearchBar
        value="test"
        onChange={mockOnChange}
        options={defaultOptions}
        onOptionsChange={mockOnOptionsChange}
      />
    );
    expect(screen.getByTitle('Clear search (Escape)')).toBeInTheDocument();
  });

  it('passes hasError to regex toggle button when regexError is set', () => {
    render(
      <SearchBar
        value="test["
        onChange={mockOnChange}
        options={{ ...defaultOptions, regex: true }}
        onOptionsChange={mockOnOptionsChange}
        regexError="bad regex"
      />
    );
    const regexButton = screen.getByTitle('Use Regular Expression (Alt+R)');
    expect(regexButton.className).toContain('errorBackground');
  });

  it('does not pass hasError to regex toggle when no regex error', () => {
    render(
      <SearchBar
        value=""
        onChange={mockOnChange}
        options={{ ...defaultOptions, regex: true }}
        onOptionsChange={mockOnOptionsChange}
      />
    );
    const regexButton = screen.getByTitle('Use Regular Expression (Alt+R)');
    expect(regexButton.className).not.toContain('errorBackground');
  });

  it('toggles matchCase option from true to false', () => {
    render(
      <SearchBar
        value=""
        onChange={mockOnChange}
        options={{ matchCase: true, wholeWord: false, regex: false }}
        onOptionsChange={mockOnOptionsChange}
      />
    );
    fireEvent.click(screen.getByTitle('Match Case (Alt+C)'));
    expect(mockOnOptionsChange).toHaveBeenCalledWith({
      matchCase: false,
      wholeWord: false,
      regex: false,
    });
  });

  it('passes onChange value from input change event', () => {
    render(
      <SearchBar
        value=""
        onChange={mockOnChange}
        options={defaultOptions}
        onOptionsChange={mockOnOptionsChange}
      />
    );
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'hello world' } });
    expect(mockOnChange).toHaveBeenCalledWith('hello world');
  });

  it('renders input with the current value', () => {
    render(
      <SearchBar
        value="existing text"
        onChange={mockOnChange}
        options={defaultOptions}
        onOptionsChange={mockOnOptionsChange}
      />
    );
    expect(screen.getByDisplayValue('existing text')).toBeInTheDocument();
  });
});
