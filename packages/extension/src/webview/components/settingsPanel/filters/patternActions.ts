import { postMessage } from '../../../vscodeApi';
import { canAddFilterPattern } from './model';

type SetFilterPatterns = (patterns: string[]) => void;

function commitFilterPatterns(patterns: string[], setFilterPatterns: SetFilterPatterns): void {
  setFilterPatterns(patterns);
  postMessage({ type: 'UPDATE_FILTER_PATTERNS', payload: { patterns } });
}

export function addFilterPattern(
  currentPatterns: string[],
  newFilterPattern: string,
  setFilterPatterns: SetFilterPatterns,
  setNewFilterPattern: (value: string) => void
): void {
  if (!canAddFilterPattern(newFilterPattern)) {
    return;
  }

  const normalizedPattern = newFilterPattern.trim();
  commitFilterPatterns([...currentPatterns, normalizedPattern], setFilterPatterns);
  setNewFilterPattern('');
}

export function deleteFilterPattern(
  currentPatterns: string[],
  pattern: string,
  setFilterPatterns: SetFilterPatterns
): void {
  commitFilterPatterns(
    currentPatterns.filter((entry) => entry !== pattern),
    setFilterPatterns
  );
}
