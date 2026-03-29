/**
 * @fileoverview Alt+key shortcuts for toggling search options.
 * @module webview/components/searchBar/altShortcuts
 */

import type { SearchOptions } from './model';

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
