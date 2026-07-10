import { describe, expect, it, vi } from 'vitest';

import type { PerfEventPayload, PerfOperation } from '../../../../../../src/shared/perf/protocol';
import { createToggleWaiterState } from '../../../../../../src/extension/perf/scope/waiters/toggle/model';
import {
  completeToggleWhenReady,
  isToggleReady,
  pendingToggleEvents,
} from '../../../../../../src/extension/perf/scope/waiters/toggle/readiness';

const operation: PerfOperation = {
  dimension: 'medium',
  operationId: 'scope-operation',
  runId: 'scope-run',
  scenario: 'scope-toggle',
};

function graphApplied(layoutChanged: boolean): Extract<
  PerfEventPayload,
  { kind: 'graph-applied' }
> {
  return {
    ...operation,
    kind: 'graph-applied',
    layoutChanged,
    nodeCount: 1,
    edgeCount: 0,
    scopeProjectionRevision: 4,
    scopeVisibility: { edgeVisibility: {}, nodeVisibility: { file: false } },
  };
}

function readyState(layoutChanged = false) {
  const state = createToggleWaiterState();
  state.graphApplied = graphApplied(layoutChanged);
  state.graphAppliedElapsedMs = 18;
  state.persisted = true;
  state.scopeProjectionRevision = 4;
  state.toggled = true;
  return state;
}

describe('extension/perf/scope/waiters/toggle/readiness', () => {
  it('requires the graph, elapsed time, toggle, and persistence acknowledgements', () => {
    expect(isToggleReady(readyState())).toBe(true);

    const missingGraph = readyState();
    missingGraph.graphApplied = undefined;
    expect(isToggleReady(missingGraph)).toBe(false);
    const missingElapsed = readyState();
    missingElapsed.graphAppliedElapsedMs = undefined;
    expect(isToggleReady(missingElapsed)).toBe(false);
    const missingToggle = readyState();
    missingToggle.toggled = false;
    expect(isToggleReady(missingToggle)).toBe(false);
    const missingPersistence = readyState();
    missingPersistence.persisted = false;
    expect(isToggleReady(missingPersistence)).toBe(false);
  });

  it('requires physics settlement for the exact changed projection', () => {
    const state = readyState(true);
    expect(isToggleReady(state)).toBe(false);
    state.graphAppliedPhysicsSettled = true;
    expect(isToggleReady(state)).toBe(true);
  });

  it('describes every pending acknowledgement in order', () => {
    expect(pendingToggleEvents(createToggleWaiterState())).toBe(
      'scope-toggle-complete, scope-persist-complete, graph-applied',
    );

    const settling = readyState(true);
    expect(pendingToggleEvents(settling)).toBe('physics-settled');
    settling.graphAppliedPhysicsSettled = true;
    expect(pendingToggleEvents(settling)).toBe('');
  });

  it('resolves only a ready toggle with its applied elapsed time', () => {
    const resolve = vi.fn();
    const notReady = readyState();
    notReady.persisted = false;
    completeToggleWhenReady(notReady, resolve);
    expect(resolve).not.toHaveBeenCalled();

    completeToggleWhenReady(readyState(), resolve);
    expect(resolve).toHaveBeenCalledWith(18);
  });
});
