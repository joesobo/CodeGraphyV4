import type { PerfScopeEntry } from '../../../shared/perf/protocol';

export type ScopeEntryIdentity = Pick<PerfScopeEntry, 'scopeKind' | 'scopeId'>;

export function entryKey(entry: ScopeEntryIdentity): string {
  return `${entry.scopeKind}:${entry.scopeId}`;
}

export function sameEntry(
  left: ScopeEntryIdentity,
  right: ScopeEntryIdentity,
): boolean {
  return left.scopeKind === right.scopeKind && left.scopeId === right.scopeId;
}

export function sortEntries(entries: readonly PerfScopeEntry[]): PerfScopeEntry[] {
  return [...entries].sort((left, right) => entryKey(left).localeCompare(entryKey(right)));
}

export function inventoriesMatch(
  expected: readonly PerfScopeEntry[],
  actual: readonly PerfScopeEntry[],
): boolean {
  const sortedExpected = sortEntries(expected);
  const sortedActual = sortEntries(actual);
  if (sortedExpected.length !== sortedActual.length) return false;
  return sortedExpected.every((entry, index) => {
    const candidate = sortedActual[index];
    return candidate !== undefined
      && sameEntry(entry, candidate)
      && entry.enabled === candidate.enabled;
  });
}

export function findEntry(
  entries: readonly PerfScopeEntry[],
  expected: ScopeEntryIdentity,
): PerfScopeEntry | undefined {
  return entries.find(entry => sameEntry(entry, expected));
}

export function findVisibilityMismatch(
  expected: readonly PerfScopeEntry[],
  actual: readonly PerfScopeEntry[],
): PerfScopeEntry | undefined {
  return expected.find((entry) => {
    const candidate = findEntry(actual, entry);
    return candidate !== undefined && candidate.enabled !== entry.enabled;
  });
}
