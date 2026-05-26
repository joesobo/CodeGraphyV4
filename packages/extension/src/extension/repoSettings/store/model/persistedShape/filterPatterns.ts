import { readStringArray } from './stringArray';

export function normalizePersistedFilterPatterns(normalized: Record<string, unknown>): void {
  if (!('filterPatterns' in normalized)) {
    return;
  }

  const filterPatterns = readStringArray(normalized.filterPatterns);
  normalized.filterPatterns = Array.from(new Set(filterPatterns));
}
