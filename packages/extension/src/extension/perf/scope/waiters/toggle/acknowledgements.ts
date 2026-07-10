import type { PerfEventPayload, PerfScopeEntry } from '../../../../../shared/perf/protocol';
import { entryKey, sameEntry } from '../../entries';
import type { ToggleWaiterState } from './model';
import { selectExpectedGraphCommit } from './projection';

type ToggleCompleteEvent = Extract<PerfEventPayload, { kind: 'scope-toggle-complete' }>;
type ToggleRejectedEvent = Extract<PerfEventPayload, { kind: 'scope-toggle-rejected' }>;
type PersistenceEvent = Extract<PerfEventPayload, { kind: 'scope-persist-complete' }>;

export function receiveToggleComplete(
  state: ToggleWaiterState,
  event: ToggleCompleteEvent,
  expected: PerfScopeEntry,
): void {
  if (!sameEntry(event, expected) || event.enabled !== expected.enabled) return;
  state.toggled = true;
  state.scopeProjectionRevision = event.scopeProjectionRevision;
  selectExpectedGraphCommit(state);
}

export function receiveToggleRejection(
  event: ToggleRejectedEvent,
  expected: PerfScopeEntry,
  reject: (error: Error) => void,
): void {
  if (!sameEntry(event, expected) || event.enabled !== expected.enabled) return;
  reject(new Error(
    `Scope toggle ${entryKey(expected)} was rejected: ${event.reason}`,
  ));
}

export function receivePersistence(
  state: ToggleWaiterState,
  event: PersistenceEvent,
  expected: PerfScopeEntry,
): void {
  if (!sameEntry(event, expected)) return;
  state.persisted = event.enabled === expected.enabled;
}
