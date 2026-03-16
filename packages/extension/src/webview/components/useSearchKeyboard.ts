/**
 * @fileoverview Hook that wires global keyboard shortcuts for the search bar.
 * Handles Ctrl+F (focus), Escape (clear), Alt+C/W/R (toggle options).
 * @module webview/components/useSearchKeyboard
 */

import { useEffect, RefObject } from 'react';
import type { SearchOptions } from './SearchBar';

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
      // Ctrl/Cmd + F to focus search
      if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        return;
      }

      // Escape to clear search (when focused)
      if (event.key === 'Escape' && document.activeElement === inputRef.current) {
        event.preventDefault();
        onChange('');
        inputRef.current?.blur();
        return;
      }

      if (!event.altKey) return;

      // Alt+C for Match Case
      if (event.key.toLowerCase() === 'c') {
        event.preventDefault();
        toggleOption('matchCase');
        return;
      }

      // Alt+W for Whole Word
      if (event.key.toLowerCase() === 'w') {
        event.preventDefault();
        toggleOption('wholeWord');
        return;
      }

      // Alt+R for Regex
      if (event.key.toLowerCase() === 'r') {
        event.preventDefault();
        toggleOption('regex');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onChange, toggleOption, inputRef]);
}
