import { describe, expect, it } from 'vitest';

import {
  entryKey,
  findEntry,
  findVisibilityMismatch,
  inventoriesMatch,
  sameEntry,
  sortEntries,
} from '../../../../src/extension/perf/scope/entries';
import type { PerfScopeEntry } from '../../../../src/shared/perf/protocol';

const fileEntry: PerfScopeEntry = {
  scopeKind: 'node',
  scopeId: 'file',
  enabled: true,
};
const importEntry: PerfScopeEntry = {
  scopeKind: 'edge',
  scopeId: 'import',
  enabled: false,
};

describe('extension/perf/scope/entries', () => {
  it('builds stable keys and compares entry identity without visibility', () => {
    expect(entryKey(fileEntry)).toBe('node:file');
    expect(sameEntry(fileEntry, { scopeKind: 'node', scopeId: 'file' })).toBe(true);
    expect(sameEntry(fileEntry, importEntry)).toBe(false);
  });

  it('sorts entries by kind and identifier without mutating the input', () => {
    const input = [fileEntry, importEntry];

    expect(sortEntries(input)).toEqual([importEntry, fileEntry]);
    expect(input).toEqual([fileEntry, importEntry]);
  });

  it('matches inventories independently of input order', () => {
    expect(inventoriesMatch([fileEntry, importEntry], [importEntry, fileEntry])).toBe(true);
    expect(inventoriesMatch([fileEntry], [{ ...fileEntry, enabled: false }])).toBe(false);
    expect(inventoriesMatch([fileEntry], [fileEntry, importEntry])).toBe(false);
  });

  it('finds entries and the first visibility mismatch', () => {
    const actual = [importEntry, { ...fileEntry, enabled: false }];

    expect(findEntry(actual, fileEntry)).toEqual({ ...fileEntry, enabled: false });
    expect(findVisibilityMismatch([fileEntry, importEntry], actual)).toEqual(fileEntry);
    expect(findVisibilityMismatch([fileEntry], [fileEntry])).toBeUndefined();
  });
});
