import { describe, expect, it, vi } from 'vitest';

import type {
  PerfEventInput,
  PerfEventPayload,
  PerfOperation,
  PerfScopeEntry,
} from '../../../../../../src/shared/perf/protocol';
import { createToggleWaiterState } from '../../../../../../src/extension/perf/scope/waiters/toggle/model';
import {
  receiveGraphCommit,
  receivePhysicsSettle,
  selectExpectedGraphCommit,
} from '../../../../../../src/extension/perf/scope/waiters/toggle/projection';

const operation: PerfOperation = {
  dimension: 'medium',
  operationId: 'scope-operation',
  runId: 'scope-run',
  scenario: 'scope-toggle',
};
const fileEntry: PerfScopeEntry = {
  scopeKind: 'node',
  scopeId: 'file',
  enabled: false,
};

function event<Input extends PerfEventInput>(
  input: Input,
): Extract<PerfEventPayload, { kind: Input['kind'] }> {
  return { ...operation, ...input } as unknown as Extract<
    PerfEventPayload,
    { kind: Input['kind'] }
  >;
}

function graphApplied(
  revision: number,
  nodeVisibility: Record<string, boolean>,
): Extract<PerfEventPayload, { kind: 'graph-applied' }> {
  return event({
    kind: 'graph-applied',
    layoutChanged: false,
    nodeCount: 1,
    edgeCount: 0,
    scopeProjectionRevision: revision,
    scopeVisibility: { edgeVisibility: {}, nodeVisibility },
  });
}

describe('extension/perf/scope/waiters/toggle/projection', () => {
  it('selects only the expected buffered projection and never replaces it', () => {
    const state = createToggleWaiterState();
    const first = graphApplied(5, { file: false });
    const replacement = graphApplied(6, { file: false });
    state.graphAppliedRevisions.set(5, {
      elapsedMs: 12,
      event: first,
      physicsSettled: false,
    });
    state.graphAppliedRevisions.set(6, {
      elapsedMs: 20,
      event: replacement,
      physicsSettled: false,
    });

    selectExpectedGraphCommit(state);
    expect(state.graphApplied).toBeUndefined();
    state.scopeProjectionRevision = 4;
    selectExpectedGraphCommit(state);
    expect(state.graphApplied).toBeUndefined();
    state.scopeProjectionRevision = 5;
    selectExpectedGraphCommit(state);
    expect(state.graphApplied).toBe(first);
    expect(state.graphAppliedElapsedMs).toBe(12);
    state.scopeProjectionRevision = 6;
    selectExpectedGraphCommit(state);
    expect(state.graphApplied).toBe(first);
  });

  it('buffers only a matching node projection and clamps negative elapsed time', () => {
    const state = createToggleWaiterState();
    state.scopeProjectionRevision = 7;
    const now = vi.fn(() => 10);

    receiveGraphCommit(state, graphApplied(6, { file: true }), fileEntry, now, 20);
    receiveGraphCommit(state, graphApplied(7, { file: false }), fileEntry, now, 20);

    expect(now).toHaveBeenCalledOnce();
    expect(state.graphApplied?.scopeProjectionRevision).toBe(7);
    expect(state.graphAppliedElapsedMs).toBe(0);
  });

  it('matches edge visibility independently of node visibility', () => {
    const state = createToggleWaiterState();
    state.scopeProjectionRevision = 3;
    const edgeEntry: PerfScopeEntry = {
      scopeKind: 'edge',
      scopeId: 'import',
      enabled: true,
    };
    const applied = event({
      kind: 'graph-applied',
      layoutChanged: false,
      nodeCount: 1,
      edgeCount: 1,
      scopeProjectionRevision: 3,
      scopeVisibility: {
        edgeVisibility: { import: true },
        nodeVisibility: { import: false },
      },
    });

    receiveGraphCommit(state, applied, edgeEntry, () => 30, 10);

    expect(state.graphApplied).toBe(applied);
    expect(state.graphAppliedElapsedMs).toBe(20);
  });

  it('records physics settlement only after the matching graph commit', () => {
    const state = createToggleWaiterState();

    receivePhysicsSettle(
      state,
      event({ kind: 'physics-settled', scopeProjectionRevision: 2 }),
    );
    expect(state.graphAppliedRevisions.has(2)).toBe(false);

    receiveGraphCommit(state, graphApplied(2, { file: false }), fileEntry, () => 30, 10);
    expect(state.graphAppliedRevisions.get(2)?.physicsSettled).toBe(false);
    receivePhysicsSettle(
      state,
      event({ kind: 'physics-settled', scopeProjectionRevision: 2 }),
    );

    expect(state.graphAppliedRevisions.get(2)?.physicsSettled).toBe(true);
  });

  it('does not settle a selected graph from another buffered projection', () => {
    const state = createToggleWaiterState();
    receiveGraphCommit(state, graphApplied(2, { file: false }), fileEntry, () => 20, 10);
    receiveGraphCommit(state, graphApplied(3, { file: false }), fileEntry, () => 30, 10);
    state.scopeProjectionRevision = 2;
    selectExpectedGraphCommit(state);

    receivePhysicsSettle(
      state,
      event({ kind: 'physics-settled', scopeProjectionRevision: 3 }),
    );

    expect(state.graphAppliedPhysicsSettled).toBe(false);
    expect(state.graphAppliedRevisions.get(3)?.physicsSettled).toBe(true);
  });
});
