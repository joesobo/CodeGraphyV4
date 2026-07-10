import { describe, expect, it } from 'vitest';

import type {
  PerfEventInput,
  PerfEventPayload,
  PerfOperation,
  PerfScopeEntry,
} from '../../../../../../src/shared/perf/protocol';
import { createToggleWaiter } from '../../../../../../src/extension/perf/scope/waiters/toggle/waiter';

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

function event(input: PerfEventInput): PerfEventPayload {
  return { ...operation, ...input } as PerfEventPayload;
}

describe('extension/perf/scope/waiters/toggle/waiter', () => {
  it('correlates a graph commit that arrives before toggle completion', async () => {
    const waiter = createToggleWaiter(fileEntry, () => 25, 10);
    waiter.receive(event({
      kind: 'graph-applied',
      layoutChanged: false,
      nodeCount: 1,
      edgeCount: 0,
      scopeProjectionRevision: 6,
      scopeVisibility: { edgeVisibility: {}, nodeVisibility: { file: false } },
    }));
    expect(waiter.pendingDescription()).toBe(
      'scope-toggle-complete, scope-persist-complete, graph-applied',
    );
    waiter.receive(event({ kind: 'scope-persist-complete', ...fileEntry }));
    waiter.receive(event({
      kind: 'scope-toggle-complete',
      scopeProjectionRevision: 6,
      ...fileEntry,
    }));

    await expect(waiter.promise).resolves.toBe(15);
  });

  it('ignores physics settlement that preceded the selected graph commit', async () => {
    const waiter = createToggleWaiter(fileEntry, () => 25, 10);
    let completed = false;
    waiter.promise.then(() => { completed = true; });
    waiter.receive(event({ kind: 'physics-settled', scopeProjectionRevision: 6 }));
    waiter.receive(event({
      kind: 'graph-applied',
      layoutChanged: true,
      nodeCount: 1,
      edgeCount: 0,
      scopeProjectionRevision: 6,
      scopeVisibility: { edgeVisibility: {}, nodeVisibility: { file: false } },
    }));
    waiter.receive(event({ kind: 'scope-persist-complete', ...fileEntry }));
    waiter.receive(event({
      kind: 'scope-toggle-complete',
      scopeProjectionRevision: 6,
      ...fileEntry,
    }));

    await Promise.resolve();
    expect(completed).toBe(false);

    waiter.receive(event({ kind: 'physics-settled', scopeProjectionRevision: 6 }));
    await expect(waiter.promise).resolves.toBe(15);
  });
});
