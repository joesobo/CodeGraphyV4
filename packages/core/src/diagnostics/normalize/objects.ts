import type { DiagnosticContextValue } from '../contracts';

type NormalizeValue = (value: unknown) => DiagnosticContextValue;

export function normalizeObjectContextValue(
  value: unknown,
  normalizeValue: NormalizeValue,
): DiagnosticContextValue | undefined {
  if (value === null || typeof value !== 'object') {
    return undefined;
  }

  const normalized: Record<string, DiagnosticContextValue> = {};
  for (const [key, entryValue] of Object.entries(value)) {
    normalized[key] = normalizeValue(entryValue);
  }
  return normalized;
}
