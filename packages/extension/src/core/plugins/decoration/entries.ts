/**
 * @fileoverview Generic decoration storage operations.
 * @module core/plugins/decoration/entries
 */

import type { DecorationEntry } from './contracts';

/**
 * Add an entry to a decoration map and return a removal function.
 */
export function addDecorationEntry<T>(
  map: Map<string, DecorationEntry<T>[]>,
  key: string,
  entry: DecorationEntry<T>,
): () => void {
  let entries = map.get(key);
  if (!entries) {
    entries = [];
    map.set(key, entries);
  }
  entries.push(entry);

  return () => {
    const list = map.get(key);
    if (list) {
      const idx = list.indexOf(entry);
      if (idx !== -1) {
        list.splice(idx, 1);
        if (list.length === 0) {
          map.delete(key);
        }
      }
    }
  };
}

/**
 * Remove all entries for a specific plugin from a decoration map.
 * Returns true if any entries were removed.
 */
export function clearPluginEntries<T>(
  map: Map<string, DecorationEntry<T>[]>,
  pluginId: string,
): boolean {
  let changed = false;

  for (const [key, entries] of map) {
    const filtered = entries.filter((e) => e.pluginId !== pluginId);
    if (filtered.length !== entries.length) {
      changed = true;
      if (filtered.length === 0) {
        map.delete(key);
      } else {
        map.set(key, filtered);
      }
    }
  }

  return changed;
}
