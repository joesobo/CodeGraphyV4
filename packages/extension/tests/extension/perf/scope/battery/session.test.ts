import { describe, expect, it, vi } from 'vitest';

import type { CorrelatedControlOperationRuntime } from '../../../../../src/extension/perf/controlOperation';
import { createScopeBatterySession } from '../../../../../src/extension/perf/scope/battery/session';
import type { PerfOperation } from '../../../../../src/shared/perf/protocol';

describe('extension/perf/scope/battery/session', () => {
  it('owns and disposes its metric and message subscriptions', () => {
    const metricSession = { dispose: vi.fn() };
    const subscription = { dispose: vi.fn() };
    const operation: PerfOperation = {
      dimension: 'medium',
      operationId: 'run-1:scope-toggle:medium:0',
      runId: 'run-1',
      scenario: 'scope-toggle',
    };
    const runtime: CorrelatedControlOperationRuntime = {
      emitMetric: vi.fn(),
      now: vi.fn(() => 0),
      onMessage: vi.fn(() => subscription),
      sendControl: vi.fn(),
      startMetricSession: vi.fn(() => metricSession),
    };

    const session = createScopeBatterySession(
      { dimension: 'medium', ordinal: 0, runId: 'run-1' },
      operation,
      runtime,
      100,
    );
    session.dispose();

    expect(runtime.startMetricSession).toHaveBeenCalledWith(operation);
    expect(metricSession.dispose).toHaveBeenCalledOnce();
    expect(subscription.dispose).toHaveBeenCalledOnce();
  });
});
