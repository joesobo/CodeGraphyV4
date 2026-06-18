export type GraphControlConfigKey =
  | 'nodeVisibility'
  | 'edgeVisibility'
  | 'nodeColors';

const DEPRECATED_SYMBOL_NODE_TYPE_KEYS = new Set([
  'symbol:variable',
]);

function shouldPruneGraphControlEntry(
  _key: GraphControlConfigKey,
  entryKey: string,
): boolean {
  if (DEPRECATED_SYMBOL_NODE_TYPE_KEYS.has(entryKey)) {
    return true;
  }

  return false;
}

export function pruneGraphControlConfigMap<T extends boolean | string>(
  key: GraphControlConfigKey,
  values: Record<string, T>,
): Record<string, T> {
  return Object.fromEntries(
    Object.entries(values).filter(([entryKey]) => !shouldPruneGraphControlEntry(key, entryKey)),
  );
}
