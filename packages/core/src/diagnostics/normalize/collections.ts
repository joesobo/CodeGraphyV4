import type { DiagnosticContextValue } from '../contracts';

type NormalizeValue = (value: unknown) => DiagnosticContextValue;

export function normalizeCollectionContextValue(
  value: unknown,
  normalizeValue: NormalizeValue,
): DiagnosticContextValue | undefined {
  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }

  if (value instanceof Set) {
    return [...value].map(normalizeValue);
  }

  if (value instanceof Map) {
    return [...value.entries()].map(([key, entryValue]) => ({
      key: normalizeValue(key),
      value: normalizeValue(entryValue),
    }));
  }

  return undefined;
}
