import { isPlainObject } from './storeObjects';

function areValuesEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function collectChangedKeys(
  previous: unknown,
  next: unknown,
  basePath = '',
): string[] {
  if (areValuesEqual(previous, next)) {
    return [];
  }

  if (!isPlainObject(previous) || !isPlainObject(next)) {
    return basePath ? [basePath] : ['codegraphy'];
  }

  const keys = new Set([...Object.keys(previous), ...Object.keys(next)]);
  const changedKeys: string[] = [];

  for (const key of keys) {
    const nextPath = basePath ? `${basePath}.${key}` : key;
    changedKeys.push(...collectChangedKeys(previous[key], next[key], nextPath));
  }

  return changedKeys;
}
