import { describe, expect, it, vi } from 'vitest';

import type {
  PerfEventInput,
  PerfEventPayload,
  PerfOperation,
  PerfScopeEntry,
} from '../../../../../../src/shared/perf/protocol';
import {
  receivePersistence,
  receiveToggleComplete,
  receiveToggleRejection,
} from '../../../../../../src/extension/perf/scope/waiters/toggle/acknowledgements';
import { createToggleWaiterState } from '../../../../../../src/extension/perf/scope/waiters/toggle/model';

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

describe('extension/perf/scope/waiters/toggle/acknowledgements', () => {
  it('accepts completion only for the requested row and value', () => {
    const state = createToggleWaiterState();
    receiveToggleComplete(state, event({
      kind: 'scope-toggle-complete',
      scopeProjectionRevision: 2,
      scopeKind: 'node',
      scopeId: 'folder',
      enabled: false,
    }), fileEntry);
    expect(state.scopeProjectionRevision).toBe(-1);

    receiveToggleComplete(state, event({
      kind: 'scope-toggle-complete',
      scopeProjectionRevision: 3,
      ...fileEntry,
      enabled: true,
    }), fileEntry);
    expect(state.toggled).toBe(false);
    expect(state.scopeProjectionRevision).toBe(-1);

    receiveToggleComplete(state, event({
      kind: 'scope-toggle-complete',
      scopeProjectionRevision: 4,
      ...fileEntry,
    }), fileEntry);
    expect(state.toggled).toBe(true);
    expect(state.scopeProjectionRevision).toBe(4);
  });

  it('selects a projection buffered before completion arrives', () => {
    const state = createToggleWaiterState();
    const applied = event({
      kind: 'graph-applied',
      layoutChanged: false,
      nodeCount: 1,
      edgeCount: 0,
      scopeProjectionRevision: 8,
      scopeVisibility: { edgeVisibility: {}, nodeVisibility: { file: false } },
    }) as Extract<PerfEventPayload, { kind: 'graph-applied' }>;
    state.graphAppliedRevisions.set(8, {
      elapsedMs: 17,
      event: applied,
      physicsSettled: false,
    });

    receiveToggleComplete(state, event({
      kind: 'scope-toggle-complete',
      scopeProjectionRevision: 8,
      ...fileEntry,
    }), fileEntry);

    expect(state.graphApplied).toBe(applied);
    expect(state.graphAppliedElapsedMs).toBe(17);
  });

  it('rejects only an exact requested row and value', () => {
    const reject = vi.fn();
    receiveToggleRejection(event({
      kind: 'scope-toggle-rejected',
      scopeKind: 'node',
      scopeId: 'folder',
      enabled: false,
      reason: 'toggle-unavailable',
    }), fileEntry, reject);
    receiveToggleRejection(event({
      kind: 'scope-toggle-rejected',
      ...fileEntry,
      enabled: true,
      reason: 'toggle-unavailable',
    }), fileEntry, reject);
    expect(reject).not.toHaveBeenCalled();

    receiveToggleRejection(event({
      kind: 'scope-toggle-rejected',
      ...fileEntry,
      reason: 'toggle-unavailable',
    }), fileEntry, reject);
    expect(reject).toHaveBeenCalledOnce();
    expect(reject.mock.calls[0]?.[0]).toEqual(new Error(
      'Scope toggle node:file was rejected: toggle-unavailable',
    ));
  });

  it('accepts persistence only for the requested row and value', () => {
    const state = createToggleWaiterState();
    receivePersistence(state, event({
      kind: 'scope-persist-complete',
      scopeKind: 'node',
      scopeId: 'folder',
      enabled: false,
    }), fileEntry);
    expect(state.persisted).toBe(false);
    receivePersistence(state, event({
      kind: 'scope-persist-complete',
      ...fileEntry,
      enabled: true,
    }), fileEntry);
    expect(state.persisted).toBe(false);

    receivePersistence(state, event({
      kind: 'scope-persist-complete',
      ...fileEntry,
    }), fileEntry);
    expect(state.persisted).toBe(true);
  });
});
