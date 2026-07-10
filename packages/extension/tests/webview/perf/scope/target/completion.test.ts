import { describe, expect, it, vi } from 'vitest';

import type {
  PerfEventInput,
  PerfOperation,
  PerfScopeEntry,
} from '../../../../../src/shared/perf/protocol';
import { completePendingToggle } from '../../../../../src/webview/perf/scope/target/completion';
import { createPendingScopeToggle } from '../../../../../src/webview/perf/scope/target/model';

const operation: PerfOperation = {
  dimension: 'large',
  operationId: 'operation-1',
  runId: 'run-1',
  scenario: 'scope-toggle',
};
const entry: PerfScopeEntry = {
  scopeKind: 'node',
  scopeId: 'file',
  enabled: false,
};

function setup(inventory: PerfScopeEntry[], emitted = true) {
  const emitFor = vi.fn((_operation: PerfOperation, _event: PerfEventInput) => emitted);
  return {
    emitFor,
    options: { bridge: { emitFor }, getInventory: vi.fn(() => inventory) },
  };
}

describe('webview/perf/scope/target/completion', () => {
  it('ignores a frame for a candidate that is no longer active', () => {
    const candidate = createPendingScopeToggle(operation, entry);
    candidate.frame = 7;
    const active = createPendingScopeToggle(operation, entry);
    const { emitFor, options } = setup([entry]);

    expect(completePendingToggle(active, candidate, options)).toBe(active);
    expect(candidate.frame).toBeUndefined();
    expect(emitFor).not.toHaveBeenCalled();
  });

  it.each([
    { inventory: [] },
    { inventory: [{ ...entry, scopeKind: 'edge' as const }] },
    { inventory: [{ ...entry, scopeId: 'folder' }] },
    { inventory: [{ ...entry, enabled: true }] },
  ])('waits when the rendered inventory does not contain the requested value', ({ inventory }) => {
    const candidate = createPendingScopeToggle(operation, entry);
    const { emitFor, options } = setup(inventory);

    expect(completePendingToggle(candidate, candidate, options)).toBe(candidate);
    expect(candidate.toggled).toBe(false);
    expect(emitFor).not.toHaveBeenCalled();
  });

  it('emits the exact projection revision and waits for persistence', () => {
    const candidate = createPendingScopeToggle(operation, entry);
    candidate.projectionRevision = 42;
    const { emitFor, options } = setup([entry]);

    expect(completePendingToggle(candidate, candidate, options)).toBe(candidate);
    expect(candidate.toggled).toBe(true);
    expect(emitFor).toHaveBeenCalledWith(operation, {
      kind: 'scope-toggle-complete',
      scopeProjectionRevision: 42,
      ...entry,
    });
  });

  it('clears a persisted candidate only when completion is emitted', () => {
    const accepted = createPendingScopeToggle(operation, entry);
    accepted.persisted = true;
    const acceptedSetup = setup([entry]);
    expect(completePendingToggle(accepted, accepted, acceptedSetup.options))
      .toBeUndefined();

    const rejected = createPendingScopeToggle(operation, entry);
    rejected.persisted = true;
    const rejectedSetup = setup([entry], false);
    expect(completePendingToggle(rejected, rejected, rejectedSetup.options))
      .toBe(rejected);
    expect(rejected.toggled).toBe(false);
  });
});
