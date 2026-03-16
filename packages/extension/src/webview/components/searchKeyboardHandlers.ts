/**
 * @fileoverview Keyboard event handler functions for the search bar.
 * @module webview/components/searchKeyboardHandlers
 */

import type { RefObject } from 'react';
import type { SearchOptions } from './searchBarTypes';

export type { SearchOptions } from './searchBarTypes';

export interface SearchKeyboardContext {
  inputRef: RefObject<HTMLInputElement | null>;
  onChange: (value: string) => void;
  toggleOption: (key: keyof SearchOptions) => void;
}

/** Handles Ctrl/Cmd+F to focus and select the search input. */
export function handleFocusShortcut(
  event: KeyboardEvent,
  inputRef: RefObject<HTMLInputElement | null>
): boolean {
  if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
    event.preventDefault();
    inputRef.current?.focus();
    inputRef.current?.select();
    return true;
  }
  return false;
}

/** Handles Escape to clear search and blur the input. */
export function handleEscapeKey(
  event: KeyboardEvent,
  inputRef: RefObject<HTMLInputElement | null>,
  onChange: (value: string) => void
): boolean {
  if (event.key === 'Escape' && document.activeElement === inputRef.current) {
    event.preventDefault();
    onChange('');
    inputRef.current?.blur();
    return true;
  }
  return false;
}

export { handleAltShortcuts } from './searchKeyboardAltShortcuts';
