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

    waiter.receive(event({
      kind: 'scope-toggle-complete',
      scopeProjectionRevision: 1,
      ...fileEntry,
    }));
    waiter.receive(event({
      kind: 'graph-applied',
      layoutChanged: false,
      nodeCount: 1,
      edgeCount: 0,
      scopeProjectionRevision: 1,
      scopeVisibility: {
        edgeVisibility: {},
        nodeVisibility: { file: false },
      },
    }));
    waiter.receive(event({
      kind: 'graph-applied',
      layoutChanged: false,
      nodeCount: 2,
      edgeCount: 0,
      scopeProjectionRevision: 1,
      scopeVisibility: {
        edgeVisibility: {},
        nodeVisibility: { file: false },
      },
    }));
    waiter.receive(event({ kind: 'scope-persist-complete', ...fileEntry }));

    await expect(waiter.promise).resolves.toBe(5);
    expect(now).toHaveBeenCalledOnce();
  });

  it('ignores current-operation graph commits without the expected scope projection', async () => {
    const now = vi.fn().mockReturnValue(30);
    const waiter = createToggleWaiter(fileEntry, now, 10);
    let completed = false;
    void waiter.promise.then(() => { completed = true; });

    waiter.receive(event({
      kind: 'scope-toggle-complete',
      scopeProjectionRevision: 1,
      ...fileEntry,
    }));
    waiter.receive(event({ kind: 'scope-persist-complete', ...fileEntry }));
    waiter.receive(event({
      kind: 'graph-applied',
      layoutChanged: false,
      nodeCount: 2,
      edgeCount: 0,
      scopeProjectionRevision: 0,
    }));
    waiter.receive(event({
      kind: 'graph-applied',
      layoutChanged: false,
      nodeCount: 2,
      edgeCount: 0,
      scopeProjectionRevision: 0,
      scopeVisibility: {
        edgeVisibility: {},
        nodeVisibility: { file: true },
      },
    }));
    await Promise.resolve();

    expect(completed).toBe(false);
    expect(waiter.pendingDescription()).toBe('graph-applied');

    waiter.receive(event({
      kind: 'graph-applied',
      layoutChanged: false,
      nodeCount: 1,
      edgeCount: 0,
      scopeProjectionRevision: 1,
      scopeVisibility: {
        edgeVisibility: {},
        nodeVisibility: { file: false },
      },
    }));

    await expect(waiter.promise).resolves.toBe(20);
    expect(now).toHaveBeenCalledOnce();
  });

  it('ignores a stale same-value projection until its exact revision is applied', async () => {
    const now = vi.fn()
      .mockReturnValueOnce(20)
      .mockReturnValueOnce(30);
    const waiter = createToggleWaiter(fileEntry, now, 10);
    let completed = false;
    void waiter.promise.then(() => { completed = true; });

    waiter.receive(event({
      kind: 'scope-toggle-complete',
      ...fileEntry,
      scopeProjectionRevision: 12,
    }));
    waiter.receive(event({ kind: 'scope-persist-complete', ...fileEntry }));
    waiter.receive(event({
      kind: 'graph-applied',
      layoutChanged: false,
      nodeCount: 1,
      edgeCount: 0,
      scopeProjectionRevision: 10,
      scopeVisibility: {
        edgeVisibility: {},
        nodeVisibility: { file: false },
      },
    }));
    await Promise.resolve();

    expect(completed).toBe(false);
    expect(waiter.pendingDescription()).toBe('graph-applied');

    waiter.receive(event({
      kind: 'graph-applied',
      layoutChanged: true,
      nodeCount: 1,
      edgeCount: 0,
      scopeProjectionRevision: 12,
      scopeVisibility: {
        edgeVisibility: {},
        nodeVisibility: { file: false },
      },
    }));
    await expect(waiter.promise).resolves.toBe(20);
    expect(now).toHaveBeenCalledTimes(2);
  });

  it('requires a matching applied edge-scope projection', async () => {
    const importsEntry: PerfScopeEntry = {
      scopeKind: 'edge',
      scopeId: 'import',
      enabled: false,
    };
    const waiter = createToggleWaiter(importsEntry, () => 30, 10);
    waiter.receive(event({
      kind: 'scope-toggle-complete',
      scopeProjectionRevision: 1,
      ...importsEntry,
    }));
    waiter.receive(event({ kind: 'scope-persist-complete', ...importsEntry }));
    waiter.receive(event({
      kind: 'graph-applied',
      layoutChanged: false,
      nodeCount: 1,
      edgeCount: 0,
      scopeProjectionRevision: 0,
    }));
    waiter.receive(event({
      kind: 'graph-applied',
      layoutChanged: false,
      nodeCount: 1,
      edgeCount: 0,
      scopeProjectionRevision: 1,
      scopeVisibility: {
        edgeVisibility: { import: false },
        nodeVisibility: {},
      },
    }));

    await expect(waiter.promise).resolves.toBe(20);
  });

  it('completes when a layout-changing projection has been applied', async () => {
    const waiter = createToggleWaiter(fileEntry, () => 20, 10);

    waiter.receive(event({
      kind: 'scope-toggle-complete',
      scopeProjectionRevision: 1,
      ...fileEntry,
    }));
    waiter.receive(event({ kind: 'scope-persist-complete', ...fileEntry }));
    waiter.receive(event({
      kind: 'graph-applied',
      layoutChanged: true,
      nodeCount: 1,
      edgeCount: 0,
      scopeProjectionRevision: 1,
      scopeVisibility: {
        edgeVisibility: {},
        nodeVisibility: { file: false },
      },
    }));
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
