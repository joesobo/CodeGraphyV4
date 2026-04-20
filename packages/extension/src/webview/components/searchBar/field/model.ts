/**
 * @fileoverview Types for the search bar component.
 * @module webview/components/searchBar/model
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
  countLabel?: string | null;
  filterPopover?: {
    disabledCustomPatterns: string[];
    disabledPluginPatterns: string[];
    customPatterns: string[];
    excludedCount: number;
    onDisabledCustomPatternsChange: (patterns: string[]) => void;
    onDisabledPluginPatternsChange: (patterns: string[]) => void;
    onOpenChange: (open: boolean) => void;
    onPatternsChange: (patterns: string[]) => void;
    open: boolean;
    pendingPatterns: string[];
    pluginPatterns: string[];
  };
}
