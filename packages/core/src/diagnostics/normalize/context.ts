import type { DiagnosticContextValue } from '../contracts';
import { normalizeCollectionContextValue } from './collections';
import { normalizeObjectContextValue } from './objects';
import {
  isScalarContextValue,
  normalizeError,
  normalizeNonJsonPrimitiveContextValue,
} from './primitives';

function normalizeContextValue(value: unknown): DiagnosticContextValue {
  if (isScalarContextValue(value)) {
    return value;
  }

  if (value instanceof Error) {
    return normalizeError(value);
  }

  return normalizeCollectionContextValue(value, normalizeContextValue)
    ?? normalizeObjectContextValue(value, normalizeContextValue)
    ?? normalizeNonJsonPrimitiveContextValue(value)
    ?? 'unknown';
}

export function normalizeContext(context: Record<string, unknown> | undefined): Record<string, DiagnosticContextValue> | undefined {
  if (!context) {
    return undefined;
  }

  const normalized: Record<string, DiagnosticContextValue> = {};
  for (const [key, value] of Object.entries(context)) {
    normalized[key] = normalizeContextValue(value);
  }
  return normalized;
}
