import { getPathSegments } from './storeAliases';
import { isPlainObject } from './storeObjects';

export function getNestedValue<T>(value: unknown, key: string): T | undefined {
  let current: unknown = value;
  for (const segment of getPathSegments(key)) {
    if (!isPlainObject(current) || !(segment in current)) {
      return undefined;
    }

    current = current[segment];
  }

  return current as T;
}

export function hasNestedValue(value: unknown, key: string): boolean {
  let current: unknown = value;
  for (const segment of getPathSegments(key)) {
    if (!isPlainObject(current) || !(segment in current)) {
      return false;
    }

    current = current[segment];
  }

  return true;
}

export function setNestedValue(
  value: Record<string, unknown>,
  key: string,
  nextValue: unknown,
): void {
  const segments = getPathSegments(key);
  const lastSegment = segments.pop();
  if (!lastSegment) {
    return;
  }

  let current: Record<string, unknown> = value;
  for (const segment of segments) {
    const existing = current[segment];
    if (!isPlainObject(existing)) {
      current[segment] = {};
    }

    current = current[segment] as Record<string, unknown>;
  }

  current[lastSegment] = nextValue;
}
