import type { DiagnosticContextValue } from '../contracts';

export function normalizeError(error: Error): Record<string, DiagnosticContextValue> {
  return {
    name: error.name,
    message: error.message,
  };
}

export function isScalarContextValue(value: unknown): value is null | string | number | boolean {
  return value === null
    || typeof value === 'string'
    || typeof value === 'number'
    || typeof value === 'boolean';
}

export function normalizeNonJsonPrimitiveContextValue(value: unknown): DiagnosticContextValue | undefined {
  if (typeof value === 'undefined') {
    return 'undefined';
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (typeof value === 'symbol') {
    return value.description ? `Symbol(${value.description})` : 'Symbol()';
  }

  if (typeof value === 'function') {
    return value.name ? `[Function: ${value.name}]` : '[Function]';
  }

  return undefined;
}
