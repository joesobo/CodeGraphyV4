import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchBar, SearchOptions } from '../../src/webview/components/SearchBar';

describe('SearchBar', () => {
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

  it('should render search input with placeholder', () => {
    render(
      <SearchBar
        value=""
        onChange={mockOnChange}
        options={defaultOptions}
        onOptionsChange={mockOnOptionsChange}
        placeholder="Search files..."
      />
    );

    expect(screen.getByPlaceholderText('Search files...')).toBeInTheDocument();
  });

  it('should render all three option toggle buttons', () => {
    render(
      <SearchBar
        value=""
        onChange={mockOnChange}
        options={defaultOptions}
        onOptionsChange={mockOnOptionsChange}
      />
    );

    expect(screen.getByTitle('Match Case (Alt+C)')).toBeInTheDocument();
    expect(screen.getByTitle('Match Whole Word (Alt+W)')).toBeInTheDocument();
    expect(screen.getByTitle('Use Regular Expression (Alt+R)')).toBeInTheDocument();
  });

  it('should call onChange when typing in input', () => {
    render(
      <SearchBar
        value=""
        onChange={mockOnChange}
        options={defaultOptions}
        onOptionsChange={mockOnOptionsChange}
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test' } });

    expect(mockOnChange).toHaveBeenCalledWith('test');
  });

  it('should toggle Match Case option when clicking button', () => {
    render(
      <SearchBar
        value=""
        onChange={mockOnChange}
        options={defaultOptions}
        onOptionsChange={mockOnOptionsChange}
      />
    );

    const matchCaseButton = screen.getByTitle('Match Case (Alt+C)');
    fireEvent.click(matchCaseButton);

    expect(mockOnOptionsChange).toHaveBeenCalledWith({
      ...defaultOptions,
      matchCase: true,
    });
  });

  it('should toggle Whole Word option when clicking button', () => {
    render(
      <SearchBar
        value=""
        onChange={mockOnChange}
        options={defaultOptions}
        onOptionsChange={mockOnOptionsChange}
      />
    );

    const wholeWordButton = screen.getByTitle('Match Whole Word (Alt+W)');
    fireEvent.click(wholeWordButton);

    expect(mockOnOptionsChange).toHaveBeenCalledWith({
      ...defaultOptions,
      wholeWord: true,
    });
  });

  it('should toggle Regex option when clicking button', () => {
    render(
      <SearchBar
        value=""
        onChange={mockOnChange}
        options={defaultOptions}
        onOptionsChange={mockOnOptionsChange}
      />
    );

    const regexButton = screen.getByTitle('Use Regular Expression (Alt+R)');
    fireEvent.click(regexButton);

    expect(mockOnOptionsChange).toHaveBeenCalledWith({
      ...defaultOptions,
      regex: true,
    });
  });

  it('should show result count when value is provided', () => {
    render(
      <SearchBar
        value="test"
        onChange={mockOnChange}
        options={defaultOptions}
        onOptionsChange={mockOnOptionsChange}
        resultCount={5}
        totalCount={100}
      />
    );

    expect(screen.getByText('5 of 100')).toBeInTheDocument();
  });

  it('should show "Invalid regex" when regexError is provided', () => {
    render(
      <SearchBar
        value="test["
        onChange={mockOnChange}
        options={{ ...defaultOptions, regex: true }}
        onOptionsChange={mockOnOptionsChange}
        resultCount={0}
        totalCount={100}
        regexError="Invalid regular expression"
      />
    );

    expect(screen.getByText('Invalid regex')).toBeInTheDocument();
  });

  it('should toggle Match Case with Alt+C keyboard shortcut', () => {
    render(
      <SearchBar
        value=""
        onChange={mockOnChange}
        options={defaultOptions}
        onOptionsChange={mockOnOptionsChange}
      />
    );

    fireEvent.keyDown(window, { key: 'c', altKey: true });

    expect(mockOnOptionsChange).toHaveBeenCalledWith({
      ...defaultOptions,
      matchCase: true,
    });
  });

  it('should toggle Whole Word with Alt+W keyboard shortcut', () => {
    render(
      <SearchBar
        value=""
        onChange={mockOnChange}
        options={defaultOptions}
        onOptionsChange={mockOnOptionsChange}
      />
    );

    fireEvent.keyDown(window, { key: 'w', altKey: true });

    expect(mockOnOptionsChange).toHaveBeenCalledWith({
      ...defaultOptions,
      wholeWord: true,
    });
  });

  it('should toggle Regex with Alt+R keyboard shortcut', () => {
    render(
      <SearchBar
        value=""
        onChange={mockOnChange}
        options={defaultOptions}
        onOptionsChange={mockOnOptionsChange}
      />
    );

    fireEvent.keyDown(window, { key: 'r', altKey: true });

    expect(mockOnOptionsChange).toHaveBeenCalledWith({
      ...defaultOptions,
      regex: true,
    });
  });

  it('should clear search when clicking clear button', () => {
    render(
      <SearchBar
        value="test"
        onChange={mockOnChange}
        options={defaultOptions}
        onOptionsChange={mockOnOptionsChange}
      />
    );

    const clearButton = screen.getByTitle('Clear search (Escape)');
    fireEvent.click(clearButton);

    expect(mockOnChange).toHaveBeenCalledWith('');
  });

  it('should show active state for enabled options', () => {
    render(
      <SearchBar
        value=""
        onChange={mockOnChange}
        options={{ matchCase: true, wholeWord: false, regex: false }}
        onOptionsChange={mockOnOptionsChange}
      />
    );

    const matchCaseButton = screen.getByTitle('Match Case (Alt+C)');
    // Check that the button has the active background color class
    expect(matchCaseButton.className).toContain('bg-[var(--vscode-inputOption-activeBackground');
  });
});
