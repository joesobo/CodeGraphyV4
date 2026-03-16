/**
 * @fileoverview Keyboard event handler functions for the search bar.
 * @module webview/components/searchKeyboardHandlers
 */

import type { RefObject } from 'react';
import type { SearchOptions } from './searchBarTypes';

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

/** Handles Alt+key shortcuts for toggling search options. */
export function handleAltShortcuts(
  event: KeyboardEvent,
  toggleOption: (key: keyof SearchOptions) => void
): boolean {
  if (!event.altKey) return false;

  // Alt+C for Match Case
  if (event.key.toLowerCase() === 'c') {
    event.preventDefault();
    toggleOption('matchCase');
    return true;
  }

  // Alt+W for Whole Word
  if (event.key.toLowerCase() === 'w') {
    event.preventDefault();
    toggleOption('wholeWord');
    return true;
  }

  // Alt+R for Regex
  if (event.key.toLowerCase() === 'r') {
    event.preventDefault();
    toggleOption('regex');
    return true;
  }

  return false;
}
