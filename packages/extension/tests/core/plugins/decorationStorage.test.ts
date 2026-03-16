import { describe, it, expect } from 'vitest';
import { addDecorationEntry, clearPluginEntries } from '../../../src/core/plugins/decorationStorage';
import type { DecorationEntry } from '../../../src/core/plugins/decorationTypes';

describe('addDecorationEntry', () => {
  it('adds an entry to a new key in the map', () => {
    const map = new Map<string, DecorationEntry<{ color: string }>[]>();
    const entry: DecorationEntry<{ color: string }> = { pluginId: 'plugin-a', decoration: { color: 'red' } };

    addDecorationEntry(map, 'node1', entry);

    expect(map.get('node1')).toEqual([entry]);
  });

  it('appends to existing entries for the same key', () => {
    const map = new Map<string, DecorationEntry<{ color: string }>[]>();
    const entry1: DecorationEntry<{ color: string }> = { pluginId: 'plugin-a', decoration: { color: 'red' } };
    const entry2: DecorationEntry<{ color: string }> = { pluginId: 'plugin-b', decoration: { color: 'blue' } };
    map.set('node1', [entry1]);

    addDecorationEntry(map, 'node1', entry2);

    expect(map.get('node1')).toEqual([entry1, entry2]);
  });

  it('returns a removal function that removes the entry', () => {
    const map = new Map<string, DecorationEntry<{ color: string }>[]>();
    const entry: DecorationEntry<{ color: string }> = { pluginId: 'plugin-a', decoration: { color: 'red' } };

    const remove = addDecorationEntry(map, 'node1', entry);
    remove();

    expect(map.has('node1')).toBe(false);
  });

  it('removal function deletes map key when the last entry is removed', () => {
    const map = new Map<string, DecorationEntry<{ color: string }>[]>();
    const entry: DecorationEntry<{ color: string }> = { pluginId: 'plugin-a', decoration: { color: 'red' } };

    const remove = addDecorationEntry(map, 'node1', entry);
    remove();

    expect(map.has('node1')).toBe(false);
  });

  it('removal function keeps map key when other entries remain', () => {
    const map = new Map<string, DecorationEntry<{ color: string }>[]>();
    const entry1: DecorationEntry<{ color: string }> = { pluginId: 'plugin-a', decoration: { color: 'red' } };
    const entry2: DecorationEntry<{ color: string }> = { pluginId: 'plugin-b', decoration: { color: 'blue' } };

    const remove1 = addDecorationEntry(map, 'node1', entry1);
    addDecorationEntry(map, 'node1', entry2);
    remove1();

    expect(map.get('node1')).toEqual([entry2]);
  });

  it('removal function is safe to call when key no longer exists in map', () => {
    const map = new Map<string, DecorationEntry<{ color: string }>[]>();
    const entry: DecorationEntry<{ color: string }> = { pluginId: 'plugin-a', decoration: { color: 'red' } };

    const remove = addDecorationEntry(map, 'node1', entry);
    map.delete('node1');

    expect(() => remove()).not.toThrow();
  });

  it('removal function is safe to call when entry is already gone from the list', () => {
    const map = new Map<string, DecorationEntry<{ color: string }>[]>();
    const entry: DecorationEntry<{ color: string }> = { pluginId: 'plugin-a', decoration: { color: 'red' } };

    const remove = addDecorationEntry(map, 'node1', entry);
    remove(); // First call removes it
    remove(); // Second call should be safe

    expect(map.has('node1')).toBe(false);
  });

  it('removal function does not remove a different entry at the same index', () => {
    const map = new Map<string, DecorationEntry<{ color: string }>[]>();
    const entry1: DecorationEntry<{ color: string }> = { pluginId: 'plugin-a', decoration: { color: 'red' } };
    const entry2: DecorationEntry<{ color: string }> = { pluginId: 'plugin-b', decoration: { color: 'blue' } };

    const remove1 = addDecorationEntry(map, 'node1', entry1);
    addDecorationEntry(map, 'node1', entry2);
    remove1();

    // entry2 should still be there
    expect(map.get('node1')).toEqual([entry2]);
  });
});

describe('clearPluginEntries', () => {
  it('removes all entries for the specified plugin', () => {
    const map = new Map<string, DecorationEntry<{ color: string }>[]>();
    map.set('node1', [
      { pluginId: 'plugin-a', decoration: { color: 'red' } },
      { pluginId: 'plugin-b', decoration: { color: 'blue' } },
    ]);
    map.set('node2', [
      { pluginId: 'plugin-a', decoration: { color: 'green' } },
    ]);

    const changed = clearPluginEntries(map, 'plugin-a');

    expect(changed).toBe(true);
    expect(map.get('node1')).toEqual([{ pluginId: 'plugin-b', decoration: { color: 'blue' } }]);
    expect(map.has('node2')).toBe(false);
  });

  it('returns false when the plugin has no entries in the map', () => {
    const map = new Map<string, DecorationEntry<{ color: string }>[]>();
    map.set('node1', [{ pluginId: 'plugin-b', decoration: { color: 'blue' } }]);

    const changed = clearPluginEntries(map, 'plugin-a');

    expect(changed).toBe(false);
    expect(map.get('node1')).toEqual([{ pluginId: 'plugin-b', decoration: { color: 'blue' } }]);
  });

  it('returns false for an empty map', () => {
    const map = new Map<string, DecorationEntry<{ color: string }>[]>();

    const changed = clearPluginEntries(map, 'plugin-a');

    expect(changed).toBe(false);
  });

  it('deletes map key when all entries for that key are from the specified plugin', () => {
    const map = new Map<string, DecorationEntry<{ color: string }>[]>();
    map.set('node1', [
      { pluginId: 'plugin-a', decoration: { color: 'red' } },
      { pluginId: 'plugin-a', decoration: { color: 'green' } },
    ]);

    clearPluginEntries(map, 'plugin-a');

    expect(map.has('node1')).toBe(false);
  });

  it('replaces the entries list with filtered version when some entries remain', () => {
    const map = new Map<string, DecorationEntry<{ color: string }>[]>();
    map.set('node1', [
      { pluginId: 'plugin-a', decoration: { color: 'red' } },
      { pluginId: 'plugin-b', decoration: { color: 'blue' } },
      { pluginId: 'plugin-a', decoration: { color: 'green' } },
    ]);

    clearPluginEntries(map, 'plugin-a');

    expect(map.get('node1')).toEqual([{ pluginId: 'plugin-b', decoration: { color: 'blue' } }]);
  });

  it('handles multiple keys with mixed ownership', () => {
    const map = new Map<string, DecorationEntry<{ color: string }>[]>();
    map.set('node1', [{ pluginId: 'plugin-a', decoration: { color: 'red' } }]);
    map.set('node2', [{ pluginId: 'plugin-b', decoration: { color: 'blue' } }]);
    map.set('node3', [
      { pluginId: 'plugin-a', decoration: { color: 'green' } },
      { pluginId: 'plugin-b', decoration: { color: 'purple' } },
    ]);

    const changed = clearPluginEntries(map, 'plugin-a');

    expect(changed).toBe(true);
    expect(map.has('node1')).toBe(false);
    expect(map.get('node2')).toEqual([{ pluginId: 'plugin-b', decoration: { color: 'blue' } }]);
    expect(map.get('node3')).toEqual([{ pluginId: 'plugin-b', decoration: { color: 'purple' } }]);
  });
});
