import type { PerfScopeEntry } from '../../../../shared/perf/protocol';
import {
  entryKey,
  findEntry,
  findVisibilityMismatch,
  inventoriesMatch,
} from '../entries';

export const scopeToggleRepetitions = 5;

export interface ScopeBatteryActions {
  operationId: string;
  requestInventory(): Promise<PerfScopeEntry[]>;
  toggle(entry: PerfScopeEntry, measured: boolean): Promise<void>;
  waitForQuietWindow(): Promise<void>;
}

function asError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

async function captureFailure(action: () => Promise<void>): Promise<Error | undefined> {
  try {
    await action();
    return undefined;
  } catch (error) {
    return asError(error);
  }
}

function combineFailures(
  operationId: string,
  measurementFailure: Error | undefined,
  restorationFailure: Error | undefined,
): Error | undefined {
  if (measurementFailure && restorationFailure) {
    return new Error(
      `Scope battery failed for ${operationId}: ${measurementFailure.message}; restoration also failed: ${restorationFailure.message}`,
    );
  }
  return measurementFailure ?? restorationFailure;
}

async function normalizeEntry(
  original: PerfScopeEntry,
  actions: ScopeBatteryActions,
): Promise<void> {
  const current = findEntry(await actions.requestInventory(), original);
  if (!current) {
    throw new Error(`Scope row ${entryKey(original)} disappeared during the battery`);
  }
  if (current.enabled !== original.enabled) await actions.toggle(original, false);
}

async function preconditionEntry(
  original: PerfScopeEntry,
  actions: ScopeBatteryActions,
): Promise<void> {
  await actions.toggle({ ...original, enabled: !original.enabled }, false);
  await actions.toggle(original, false);
}

async function measureEntry(
  original: PerfScopeEntry,
  actions: ScopeBatteryActions,
): Promise<void> {
  await normalizeEntry(original, actions);
  await preconditionEntry(original, actions);
  await actions.waitForQuietWindow();
  for (let repetition = 0; repetition < scopeToggleRepetitions; repetition += 1) {
    await actions.toggle({ ...original, enabled: !original.enabled }, true);
    await actions.waitForQuietWindow();
    await actions.toggle(original, true);
    await actions.waitForQuietWindow();
  }
}

async function measureEntries(
  entries: readonly PerfScopeEntry[],
  actions: ScopeBatteryActions,
): Promise<void> {
  for (const entry of entries) await measureEntry(entry, actions);
}

async function restoreAndVerify(
  expected: readonly PerfScopeEntry[],
  actions: ScopeBatteryActions,
): Promise<void> {
  const maxRestorations = Math.max(1, expected.length * 2);
  for (let attempt = 0; attempt < maxRestorations; attempt += 1) {
    const current = await actions.requestInventory();
    if (inventoriesMatch(expected, current)) return;
    const mismatch = findVisibilityMismatch(expected, current);
    if (!mismatch) {
      throw new Error(`Unable to restore complete scope inventory for ${actions.operationId}`);
    }
    await actions.toggle(mismatch, false);
  }

  const finalInventory = await actions.requestInventory();
  if (!inventoriesMatch(expected, finalInventory)) {
    throw new Error(`Final scope inventory does not match ${actions.operationId}`);
  }
}

export async function executeScopeBattery(
  actions: ScopeBatteryActions,
): Promise<PerfScopeEntry[]> {
  const originalEntries = await actions.requestInventory();
  const measurementFailure = await captureFailure(
    () => measureEntries(originalEntries, actions),
  );
  const restorationFailure = await captureFailure(
    () => restoreAndVerify(originalEntries, actions),
  );
  const failure = combineFailures(
    actions.operationId,
    measurementFailure,
    restorationFailure,
  );
  if (failure) throw failure;
  return originalEntries;
}
