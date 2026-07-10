import { describe, expect, it, vi } from 'vitest';

import { createGraphAcknowledgement } from '../../../../src/extension/perf/operation/acknowledgement';
import type { PerfEventInput, PerfEventPayload, PerfOperation } from '../../../../src/shared/perf/protocol';

const operation: PerfOperation = {
  operationId: 'operation-1',
  runId: 'run-1',
  scenario: 'rename',
  dimension: 'medium',
};

function event(input: PerfEventInput): PerfEventPayload {
  return { ...operation, ...input } as PerfEventPayload;
}

function graphApplied(scopeProjectionRevision: number, layoutChanged: boolean) {
  return event({
    kind: 'graph-applied',
    layoutChanged,
    nodeCount: 2,
    edgeCount: 1,
    scopeProjectionRevision,
  });
}

describe('extension/perf/operation/acknowledgement', () => {
  it('completes a graph application that does not change layout', async () => {
    const onGraphApplied = vi.fn();
    const acknowledgement = createGraphAcknowledgement(vi.fn(), onGraphApplied);
    const applied = graphApplied(3, false);

    acknowledgement.receive(applied);

    await expect(acknowledgement.promise).resolves.toBe(applied);
    expect(onGraphApplied).toHaveBeenCalledOnce();
  });

  it('requires matching physics observed after a changed graph application', async () => {
    const acknowledgement = createGraphAcknowledgement(vi.fn(), vi.fn());
    let completed = false;
    acknowledgement.promise.then(() => { completed = true; });
    acknowledgement.receive(event({ kind: 'physics-settled', scopeProjectionRevision: 5 }));
    acknowledgement.receive(graphApplied(5, true));
    acknowledgement.receive(event({ kind: 'physics-settled', scopeProjectionRevision: 4 }));
    await Promise.resolve();
    expect(completed).toBe(false);

    acknowledgement.receive(event({ kind: 'physics-settled', scopeProjectionRevision: 5 }));

    await expect(acknowledgement.promise).resolves.toMatchObject({
      kind: 'graph-applied',
      scopeProjectionRevision: 5,
    });
  });

  it('forwards metric context without completing the graph acknowledgement', async () => {
    const emitMetric = vi.fn();
    const acknowledgement = createGraphAcknowledgement(emitMetric, vi.fn());
    let completed = false;
    acknowledgement.promise.then(() => { completed = true; });

    acknowledgement.receive(event({
      kind: 'metric',
      metric: 'payloadBytes',
      value: 512,
      unit: 'bytes',
    }));
    await Promise.resolve();

    expect(completed).toBe(false);
    expect(emitMetric).toHaveBeenCalledWith({
      ...operation,
      metric: 'payloadBytes',
      value: 512,
      unit: 'bytes',
    });
  });
});
