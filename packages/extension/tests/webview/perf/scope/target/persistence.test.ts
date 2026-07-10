import { describe, expect, it, vi } from 'vitest';

import type {
  PerfEventInput,
  PerfOperation,
  PerfScopeEntry,
} from '../../../../../src/shared/perf/protocol';
import type { IGraphControlsSnapshot } from '../../../../../src/shared/graphControls/contracts';
import { createPendingScopeToggle } from '../../../../../src/webview/perf/scope/target/model';
import { receivePendingPersistence } from '../../../../../src/webview/perf/scope/target/persistence';

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

function snapshot(enabled: boolean): IGraphControlsSnapshot {
  return {
    nodeTypes: [{ id: 'file', label: 'File', defaultColor: '#fff', defaultVisible: true }],
    edgeTypes: [],
    nodeColors: {},
    nodeVisibility: { file: enabled },
    edgeVisibility: {},
  };
}

function bridge(emitted = true) {
  const emitFor = vi.fn((_operation: PerfOperation, _event: PerfEventInput) => emitted);
  return { emitFor };
}

describe('webview/perf/scope/target/persistence', () => {
  it('ignores missing, unposted, persisted, and mismatched candidates', () => {
    const transport = bridge();
    expect(receivePendingPersistence(undefined, snapshot(false), transport)).toBeUndefined();

    const unposted = createPendingScopeToggle(operation, entry);
    expect(receivePendingPersistence(unposted, snapshot(false), transport)).toBe(unposted);
    const persisted = createPendingScopeToggle(operation, entry);
    persisted.posted = true;
    persisted.persisted = true;
    expect(receivePendingPersistence(persisted, snapshot(false), transport)).toBe(persisted);
    const mismatched = createPendingScopeToggle(operation, entry);
    mismatched.posted = true;
    expect(receivePendingPersistence(mismatched, snapshot(true), transport)).toBe(mismatched);
    expect(transport.emitFor).not.toHaveBeenCalled();
  });

  it('records host-observed persistence and waits for toggle completion', () => {
    const candidate = createPendingScopeToggle(operation, entry);
    candidate.posted = true;
    const transport = bridge();

    expect(receivePendingPersistence(candidate, snapshot(false), transport)).toBe(candidate);
    expect(candidate.persisted).toBe(true);
    expect(transport.emitFor).toHaveBeenCalledWith(operation, {
      kind: 'scope-persist-complete',
      ...entry,
    });
  });

  it('clears only when persistence emission and toggle completion both succeed', () => {
    const accepted = createPendingScopeToggle(operation, entry);
    accepted.posted = true;
    accepted.toggled = true;
    expect(receivePendingPersistence(accepted, snapshot(false), bridge()))
      .toBeUndefined();

    const rejected = createPendingScopeToggle(operation, entry);
    rejected.posted = true;
    rejected.toggled = true;
    expect(receivePendingPersistence(rejected, snapshot(false), bridge(false)))
      .toBe(rejected);
    expect(rejected.persisted).toBe(false);
  });
});
