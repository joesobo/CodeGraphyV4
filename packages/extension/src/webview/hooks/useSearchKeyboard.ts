/**
 * @fileoverview Hook for global keyboard shortcuts used by the search bar.
 * Handles Ctrl/Cmd+F to focus, Escape to clear, and Alt+C/W/R to toggle options.
 */

import { useEffect, type RefObject } from 'react';
import type { SearchOptions } from '../components/SearchBar';

interface UseSearchKeyboardOptions {
  inputRef: RefObject<HTMLInputElement | null>;
  onChange: (value: string) => void;
  toggleOption: (key: keyof SearchOptions) => void;
}

/**
 * Attaches global keyboard shortcuts for the search bar.
 *
 * - Ctrl/Cmd+F: focus and select the search input
 * - Escape: clear the input and blur (only when focused)
 * - Alt+C: toggle Match Case
 * - Alt+W: toggle Whole Word
 * - Alt+R: toggle Regex
 */
export function useSearchKeyboard({ inputRef, onChange, toggleOption }: UseSearchKeyboardOptions): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
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

      // Alt+C for Match Case
      if (event.altKey && event.key.toLowerCase() === 'c') {
        event.preventDefault();
        toggleOption('matchCase');
        return;
      }

      // Alt+W for Whole Word
      if (event.altKey && event.key.toLowerCase() === 'w') {
        event.preventDefault();
        toggleOption('wholeWord');
        return;
      }

      // Alt+R for Regex
      if (event.altKey && event.key.toLowerCase() === 'r') {
        event.preventDefault();
        toggleOption('regex');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inputRef, onChange, toggleOption]);
}
