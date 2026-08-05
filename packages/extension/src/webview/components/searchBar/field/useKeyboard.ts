/**
 * @fileoverview Hook that wires global keyboard shortcuts for the search bar.
 * Handles Ctrl+F (focus), Escape (clear), Alt+C/W/R (toggle options).
 * @module webview/components/searchBar/useKeyboard
 */

import { useEffect, type RefObject } from 'react';
import type { SearchOptions } from './model';
import {
  handleFocusShortcut,
  handleAltShortcuts,
} from './keyboard';

interface ISearchKeyboardOptions {
  inputRef: RefObject<HTMLInputElement | null>;
  toggleOption: (key: keyof SearchOptions) => void;
}

/**
 * Attaches global keyboard listeners for the search bar to the window.
 * Cleaned up automatically on unmount.
 */
export function useSearchKeyboard({
  inputRef,
  toggleOption,
}: ISearchKeyboardOptions): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (handleFocusShortcut(event, inputRef)) return;
      handleAltShortcuts(event, toggleOption);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleOption, inputRef]);
}
