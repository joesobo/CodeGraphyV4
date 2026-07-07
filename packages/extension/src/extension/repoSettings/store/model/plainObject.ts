import { isObjectRecord } from '../../../../shared/records';

export function deepClone<T>(value: T): T {
  return structuredClone(value);
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return isObjectRecord(value);
}

export function deepMerge<T>(base: T, overrides: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(overrides)) {
    return (overrides as T) ?? base;
  }

  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    const existing = result[key];
    if (isPlainObject(existing) && isPlainObject(value)) {
      result[key] = deepMerge(existing, value);
      continue;
    }

    result[key] = value;
  }

  return result as T;
}
