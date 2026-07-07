import { looseStringArraySchema } from '../../../../../shared/values';

export function normalizePersistedFilterPatterns(normalized: Record<string, unknown>): void {
  if (!('filterPatterns' in normalized)) {
    return;
  }

  const filterPatterns = looseStringArraySchema.parse(normalized.filterPatterns);
  normalized.filterPatterns = Array.from(new Set(filterPatterns));
}
