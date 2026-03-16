/**
 * @fileoverview Hook that wires global keyboard shortcuts for the search bar.
 * Handles Ctrl+F (focus), Escape (clear), Alt+C/W/R (toggle options).
 * @module webview/components/useSearchKeyboard
 */

import { useEffect, RefObject } from 'react';
import type { SearchOptions } from './searchBarTypes';
import {
  handleFocusShortcut,
  handleEscapeKey,
  handleAltShortcuts,
} from './searchKeyboardHandlers';

interface ISearchKeyboardOptions {
  inputRef: RefObject<HTMLInputElement | null>;
  onChange: (value: string) => void;
  toggleOption: (key: keyof SearchOptions) => void;
}

/**
 * Attaches global keyboard listeners for the search bar to the window.
 * Cleaned up automatically on unmount.
 */
export function useSearchKeyboard({
  inputRef,
  onChange,
  toggleOption,
}: ISearchKeyboardOptions): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (handleFocusShortcut(event, inputRef)) return;
      if (handleEscapeKey(event, inputRef, onChange)) return;
      handleAltShortcuts(event, toggleOption);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onChange, toggleOption, inputRef]);
}
