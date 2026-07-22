import { isPlainObject } from '../plainObject';

export function normalizePersistedInterfaces(normalized: Record<string, unknown>): void {
  if (!('interfaces' in normalized)) return;
  if (!Array.isArray(normalized.interfaces)) {
    delete normalized.interfaces;
    return;
  }

  normalized.interfaces = normalized.interfaces.filter((entry) => (
    isPlainObject(entry)
    && typeof entry.id === 'string'
    && entry.id.trim().length > 0
    && 'data' in entry
  ));
}
