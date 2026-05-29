import type React from 'react';
import {
  addFilterPatterns,
  commitFilterPatterns,
  filterPatternsEqual,
} from '../model';

export function commitPatterns(
  onPatternsChange: (patterns: string[]) => void,
  patterns: string[],
): void {
  onPatternsChange(patterns);
  commitFilterPatterns(patterns);
}

export function updateDraftPattern(
  setDraftPattern: React.Dispatch<React.SetStateAction<string>>,
  setDraftPendingPatterns: React.Dispatch<React.SetStateAction<string[]>>,
  value: string,
): void {
  setDraftPattern(value);
  setDraftPendingPatterns([]);
}

export function handleAddPatterns(
  canAdd: boolean,
  customPatterns: string[],
  addablePatterns: string[],
  onPatternsChange: (patterns: string[]) => void,
  resetDraft: () => void,
): void {
  if (!canAdd) {
    return;
  }

  const nextPatterns = addFilterPatterns(customPatterns, addablePatterns);
  if (!filterPatternsEqual(customPatterns, nextPatterns)) {
    commitPatterns(onPatternsChange, nextPatterns);
  }

  resetDraft();
}
