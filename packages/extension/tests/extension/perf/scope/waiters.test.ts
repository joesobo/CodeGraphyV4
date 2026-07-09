import { describe, expect, it, vi } from 'vitest';

import {
  createInventoryWaiter,
  createToggleWaiter,
  withTimeout,
} from '../../../../src/extension/perf/scope/waiters';
import type {
  PerfEventInput,
  PerfEventPayload,
  PerfOperation,
  PerfScopeEntry,
} from '../../../../src/shared/perf/protocol';

const operation: PerfOperation = {
  dimension: 'small',
  operationId: 'scope-operation',
  runId: 'scope-run',
  scenario: 'scope-toggle',
};
const fileEntry: PerfScopeEntry = {
  scopeKind: 'node',
  scopeId: 'file',
  enabled: false,
};

function event(
  payload: PerfEventInput,
): PerfEventPayload {
  return { ...operation, ...payload } as PerfEventPayload;
}

describe('extension/perf/scope/waiters', () => {
  it('sorts an inventory response and rejects an unavailable target', async () => {
    const resolved = createInventoryWaiter();
    resolved.receive(event({
      kind: 'scope-inventory',
      entries: [fileEntry, { scopeKind: 'edge', scopeId: 'import', enabled: true }],
    }));

    await expect(resolved.promise).resolves.toEqual([
      { scopeKind: 'edge', scopeId: 'import', enabled: true },
      fileEntry,
    ]);

    const rejected = createInventoryWaiter();
    rejected.receive(event({ kind: 'scope-inventory-rejected', reason: 'target-unavailable' }));
    await expect(rejected.promise).rejects.toThrow('target-unavailable');
  });

  it('latches the first graph commit before a later persistence acknowledgement', async () => {
    const now = vi.fn()
      .mockReturnValueOnce(15)
      .mockReturnValueOnce(99);
    const waiter = createToggleWaiter(fileEntry, now, 10);

    waiter.receive(event({ kind: 'scope-toggle-complete', ...fileEntry }));
    waiter.receive(event({
      kind: 'graph-applied',
      layoutChanged: false,
      nodeCount: 1,
      edgeCount: 0,
    }));
    waiter.receive(event({
      kind: 'graph-applied',
      layoutChanged: false,
      nodeCount: 2,
      edgeCount: 0,
    }));
    waiter.receive(event({ kind: 'scope-persist-complete', ...fileEntry }));

    await expect(waiter.promise).resolves.toBe(5);
    expect(now).toHaveBeenCalledOnce();
  });

  it('requires physics only when the applied projection changed layout', async () => {
    const waiter = createToggleWaiter(fileEntry, () => 20, 10);
    let completed = false;
    void waiter.promise.then(() => { completed = true; });

    waiter.receive(event({ kind: 'scope-toggle-complete', ...fileEntry }));
    waiter.receive(event({ kind: 'scope-persist-complete', ...fileEntry }));
    waiter.receive(event({
      kind: 'graph-applied',
      layoutChanged: true,
      nodeCount: 1,
      edgeCount: 0,
    }));
    await Promise.resolve();
    expect(completed).toBe(false);
    expect(waiter.pendingDescription()).toBe('physics-settled');

    waiter.receive(event({ kind: 'physics-settled' }));
    await expect(waiter.promise).resolves.toBe(10);
  });

  it('rejects only the matching requested scope value', async () => {
    const waiter = createToggleWaiter(fileEntry, () => 20, 10);
    waiter.receive(event({
      kind: 'scope-toggle-rejected',
      ...fileEntry,
      enabled: true,
      reason: 'toggle-unavailable',
    }));
    waiter.receive(event({
      kind: 'scope-toggle-rejected',
      ...fileEntry,
      reason: 'toggle-unavailable',
    }));

    await expect(waiter.promise).rejects.toThrow('node:file was rejected');
  });

  it('times out with the caller description', async () => {
    await expect(withTimeout(new Promise(() => {}), 1, () => 'scope timeout'))
      .rejects.toThrow('scope timeout');
  });
});
