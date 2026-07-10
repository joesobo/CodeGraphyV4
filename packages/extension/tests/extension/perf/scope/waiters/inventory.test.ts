import { describe, expect, it } from 'vitest';

import { createInventoryWaiter } from '../../../../../src/extension/perf/scope/waiters/inventory';
import type {
  PerfEventInput,
  PerfEventPayload,
  PerfOperation,
} from '../../../../../src/shared/perf/protocol';

const operation: PerfOperation = {
  dimension: 'small',
  operationId: 'scope-operation',
  runId: 'scope-run',
  scenario: 'scope-toggle',
};

function event(input: PerfEventInput): PerfEventPayload {
  return { ...operation, ...input } as PerfEventPayload;
}

describe('extension/perf/scope/waiters/inventory', () => {
  it('sorts an inventory response', async () => {
    const waiter = createInventoryWaiter();
    waiter.receive(event({ kind: 'physics-settled', scopeProjectionRevision: 0 }));
    waiter.receive(event({
      kind: 'scope-inventory',
      entries: [
        { scopeKind: 'node', scopeId: 'file', enabled: false },
        { scopeKind: 'edge', scopeId: 'import', enabled: true },
      ],
    }));

    await expect(waiter.promise).resolves.toEqual([
      { scopeKind: 'edge', scopeId: 'import', enabled: true },
      { scopeKind: 'node', scopeId: 'file', enabled: false },
    ]);
  });

  it('rejects an unavailable inventory target', async () => {
    const waiter = createInventoryWaiter();
    waiter.receive(event({ kind: 'scope-inventory-rejected', reason: 'target-unavailable' }));

    await expect(waiter.promise).rejects.toThrow('target-unavailable');
  });
});
