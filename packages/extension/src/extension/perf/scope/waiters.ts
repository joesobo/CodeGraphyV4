import type {
  PerfEventPayload,
  PerfScopeEntry,
} from '../../../shared/perf/protocol';
import { entryKey, sameEntry, sortEntries } from './entries';

export interface InventoryWaiter {
  promise: Promise<PerfScopeEntry[]>;
  receive(event: PerfEventPayload): void;
}

export interface ToggleWaiter {
  pendingDescription(): string;
  promise: Promise<number>;
  receive(event: PerfEventPayload): void;
}

interface ToggleWaiterState {
  graphApplied: Extract<PerfEventPayload, { kind: 'graph-applied' }> | undefined;
  graphAppliedElapsedMs: number | undefined;
  persisted: boolean;
  physicsSettled: boolean;
  toggled: boolean;
}

function receiveToggleComplete(
  state: ToggleWaiterState,
  event: PerfEventPayload,
  expected: PerfScopeEntry,
): void {
  if (event.kind !== 'scope-toggle-complete') return;
  if (!sameEntry(event, expected)) return;
  state.toggled = event.enabled === expected.enabled;
}

function receiveToggleRejection(
  event: PerfEventPayload,
  expected: PerfScopeEntry,
  reject: (error: Error) => void,
): void {
  if (event.kind !== 'scope-toggle-rejected') return;
  if (!sameEntry(event, expected) || event.enabled !== expected.enabled) return;
  reject(new Error(
    `Scope toggle ${entryKey(expected)} was rejected: ${event.reason}`,
  ));
}

function receivePersistence(
  state: ToggleWaiterState,
  event: PerfEventPayload,
  expected: PerfScopeEntry,
): void {
  if (event.kind !== 'scope-persist-complete') return;
  if (!sameEntry(event, expected)) return;
  state.persisted = event.enabled === expected.enabled;
}

function receiveGraphCommit(
  state: ToggleWaiterState,
  event: PerfEventPayload,
  expected: PerfScopeEntry,
  now: () => number,
  startedAt: number,
): void {
  if (event.kind !== 'graph-applied' || state.graphApplied) return;
  const visibility = expected.scopeKind === 'node'
    ? event.scopeVisibility?.nodeVisibility
    : event.scopeVisibility?.edgeVisibility;
  if (visibility?.[expected.scopeId] !== expected.enabled) return;
  state.graphApplied = event;
  state.graphAppliedElapsedMs = Math.max(0, now() - startedAt);
}

function receivePhysicsSettle(
  state: ToggleWaiterState,
  event: PerfEventPayload,
): void {
  if (event.kind !== 'physics-settled') return;
  if (!state.graphApplied?.layoutChanged) return;
  state.physicsSettled = true;
}

function isToggleReady(state: ToggleWaiterState): boolean {
  return state.graphApplied !== undefined
    && state.graphAppliedElapsedMs !== undefined
    && state.toggled
    && state.persisted
    && (!state.graphApplied.layoutChanged || state.physicsSettled);
}

function completeToggleWhenReady(
  state: ToggleWaiterState,
  resolve: (elapsedMs: number) => void,
): void {
  if (!isToggleReady(state)) return;
  resolve(state.graphAppliedElapsedMs!);
}

function pendingToggleEvents(state: ToggleWaiterState): string {
  const pending: string[] = [];
  if (!state.toggled) pending.push('scope-toggle-complete');
  if (!state.persisted) pending.push('scope-persist-complete');
  if (!state.graphApplied) pending.push('graph-applied');
  if (state.graphApplied?.layoutChanged && !state.physicsSettled) {
    pending.push('physics-settled');
  }
  return pending.join(', ');
}

export function createInventoryWaiter(): InventoryWaiter {
  let reject: (error: Error) => void = () => {};
  let resolve: (entries: PerfScopeEntry[]) => void = () => {};
  const promise = new Promise<PerfScopeEntry[]>((complete, fail) => {
    resolve = complete;
    reject = fail;
  });

  return {
    promise,
    receive(event): void {
      if (event.kind === 'scope-inventory') {
        resolve(sortEntries(event.entries));
      }
      if (event.kind === 'scope-inventory-rejected') {
        reject(new Error(`Scope inventory was rejected: ${event.reason}`));
      }
    },
  };
}

export function createToggleWaiter(
  expected: PerfScopeEntry,
  now: () => number,
  startedAt: number,
): ToggleWaiter {
  const state: ToggleWaiterState = {
    graphApplied: undefined,
    graphAppliedElapsedMs: undefined,
    persisted: false,
    physicsSettled: false,
    toggled: false,
  };
  let reject: (error: Error) => void = () => {};
  let resolve: (elapsedMs: number) => void = () => {};
  const promise = new Promise<number>((complete, fail) => {
    resolve = complete;
    reject = fail;
  });

  return {
    pendingDescription: () => pendingToggleEvents(state),
    promise,
    receive(event): void {
      receiveToggleComplete(state, event, expected);
      receiveToggleRejection(event, expected, reject);
      receivePersistence(state, event, expected);
      receiveGraphCommit(state, event, expected, now, startedAt);
      receivePhysicsSettle(state, event);
      completeToggleWhenReady(state, resolve);
    },
  };
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: () => string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(message())), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
