import type { PerfScopeEntry } from '../../../../../shared/perf/protocol';
import type {
  GraphAppliedEvent,
  PhysicsSettledEvent,
  ToggleWaiterState,
} from './model';

export function selectExpectedGraphCommit(state: ToggleWaiterState): void {
  if (state.graphApplied) return;
  const candidate = state.graphAppliedRevisions.get(state.scopeProjectionRevision);
  if (!candidate) return;
  state.graphApplied = candidate.event;
  state.graphAppliedElapsedMs = candidate.elapsedMs;
  state.graphAppliedPhysicsSettled = candidate.physicsSettled;
}

export function receiveGraphCommit(
  state: ToggleWaiterState,
  event: GraphAppliedEvent,
  expected: PerfScopeEntry,
  now: () => number,
  startedAt: number,
): void {
  if (state.graphApplied) return;
  const visibility = expected.scopeKind === 'node'
    ? event.scopeVisibility?.nodeVisibility
    : event.scopeVisibility?.edgeVisibility;
  if (visibility?.[expected.scopeId] !== expected.enabled) return;
  state.graphAppliedRevisions.set(event.scopeProjectionRevision, {
    elapsedMs: Math.max(0, now() - startedAt),
    event,
    physicsSettled: false,
  });
  selectExpectedGraphCommit(state);
}

export function receivePhysicsSettle(
  state: ToggleWaiterState,
  event: PhysicsSettledEvent,
): void {
  const candidate = state.graphAppliedRevisions.get(event.scopeProjectionRevision);
  if (!candidate) return;
  candidate.physicsSettled = true;
  if (state.graphApplied === candidate.event) {
    state.graphAppliedPhysicsSettled = true;
  }
}
