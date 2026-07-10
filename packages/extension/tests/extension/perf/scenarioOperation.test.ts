import { describe, expect, it, vi } from 'vitest';

import { createPerfScenarioOperationRunner } from '../../../src/extension/perf/scenarioOperation';
import type { CorrelatedGraphOperationRuntime } from '../../../src/extension/perf/operation';
import type { PerfOperation } from '../../../src/shared/perf/protocol';

const operation: PerfOperation = {
  operationId: 'run-1:rename:small:0',
  runId: 'run-1',
  scenario: 'rename',
  dimension: 'small',
};

function setup() {
  const emitMetric = vi.fn();
  const runtime = { emitMetric } as unknown as CorrelatedGraphOperationRuntime;
  const action = vi.fn(async () => {});
  const runGraphOperation = vi.fn(async () => ({
    elapsedMs: 14,
    graphAppliedMs: 11,
    graphApplied: {
      ...operation,
      kind: 'graph-applied' as const,
      layoutChanged: false,
      nodeCount: 100,
      edgeCount: 75,
      scopeProjectionRevision: 0,
    },
  }));

  return { action, emitMetric, runGraphOperation, runtime };
}

describe('extension/perf/scenarioOperation', () => {
  it('records file-operation roundtrip latency for rename', async () => {
    const harness = setup();
    const runOperation = createPerfScenarioOperationRunner(
      harness.runtime,
      harness.runGraphOperation,
    );

    await runOperation(operation, harness.action);

    expect(harness.emitMetric).toHaveBeenCalledWith({
      ...operation,
      metric: 'fileOpRoundtripMs',
      unit: 'ms',
      value: 11,
    });
  });

  it('does not label a save as a direct file operation', async () => {
    const harness = setup();
    const runOperation = createPerfScenarioOperationRunner(
      harness.runtime,
      harness.runGraphOperation,
    );

    await runOperation({ ...operation, scenario: 'single-save' }, harness.action);

    expect(harness.emitMetric).not.toHaveBeenCalled();
  });

  it('does not record a roundtrip when graph acknowledgement fails', async () => {
    const harness = setup();
    harness.runGraphOperation.mockRejectedValueOnce(new Error('ack failed'));
    const runOperation = createPerfScenarioOperationRunner(
      harness.runtime,
      harness.runGraphOperation,
    );

    await expect(runOperation(operation, harness.action)).rejects.toThrow('ack failed');

    expect(harness.emitMetric).not.toHaveBeenCalled();
  });
});
