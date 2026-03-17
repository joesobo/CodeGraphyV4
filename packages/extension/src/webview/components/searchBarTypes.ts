/**
 * @fileoverview Types for the search bar component.
 * @module webview/components/searchBarTypes
 */

export interface SearchOptions {
  matchCase: boolean;
  wholeWord: boolean;
  regex: boolean;
}

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  options: SearchOptions;
  onOptionsChange: (options: SearchOptions) => void;
  placeholder?: string;
  className?: string;
  resultCount?: number;
  totalCount?: number;
  regexError?: string | null;
}
