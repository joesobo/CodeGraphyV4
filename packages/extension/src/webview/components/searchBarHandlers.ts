/**
 * @fileoverview Handler logic for the search bar component.
 * @module webview/components/searchBarHandlers
 */

import { useRef, useCallback } from 'react';
import type { SearchOptions } from './searchBarTypes';
import { useSearchKeyboard } from './useSearchKeyboard';

export function useSearchBarHandlers(
  options: SearchOptions,
  onOptionsChange: (options: SearchOptions) => void,
  onChange: (value: string) => void,
) {
  const inputRef = useRef<HTMLInputElement>(null);

  const toggleOption = useCallback((key: keyof SearchOptions) => {
    onOptionsChange({ ...options, [key]: !options[key] });
  }, [options, onOptionsChange]);

  useSearchKeyboard({ inputRef, onChange, toggleOption });

  const handleClear = useCallback(() => {
    onChange('');
    inputRef.current?.focus();
  }, [onChange]);

  return { inputRef, toggleOption, handleClear };
}
