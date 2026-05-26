import { isPlainObject } from '../plainObject';

export function pickObjectKeys(
  value: unknown,
  allowedKeys: ReadonlySet<string>,
): Record<string, unknown> | undefined {
  if (!isPlainObject(value)) {
    return undefined;
  }

  const picked: Record<string, unknown> = {};
  for (const [key, entryValue] of Object.entries(value)) {
    if (allowedKeys.has(key) && entryValue !== undefined) {
      picked[key] = entryValue;
    }
  }

  return picked;
}
