/**
 * @fileoverview Handler logic for the search bar component.
 * @module webview/components/searchBar/handlers
 */

import React, { useRef, useCallback } from 'react';
import type { SearchOptions } from './model';
import { useSearchKeyboard } from './useKeyboard';
import { handleEscapeKey } from './keyboard';

export function useSearchBarHandlers(
  options: SearchOptions,
  onOptionsChange: (options: SearchOptions) => void,
  onChange: (value: string) => void,
) {
  const inputRef = useRef<HTMLInputElement>(null);

  const toggleOption = useCallback((key: keyof SearchOptions) => {
    onOptionsChange({ ...options, [key]: !options[key] });
  }, [options, onOptionsChange]);

  useSearchKeyboard({ inputRef, toggleOption });

  const handleInputKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    handleEscapeKey(event, inputRef, onChange);
  }, [onChange]);

  const handleClear = useCallback(() => {
    onChange('');
    inputRef.current?.focus();
  }, [onChange]);

  return { inputRef, toggleOption, handleClear, handleInputKeyDown };
}
