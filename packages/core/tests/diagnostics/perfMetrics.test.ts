import { describe, expect, it } from 'vitest';
import {
  emitPerfMetric,
  onPerfMetric,
  perfMetricDiagnosticEventSchema,
  type PerfMetricDiagnosticEvent,
} from '../../src/diagnostics/perfMetrics';

const validMetricEvent = {
  area: 'performance',
  event: 'metric',
  context: {
    runId: 'run-1',
    scenario: 'cold-open',
    operationId: 'operation-1',
    metric: 'coldOpenMs',
    value: 125,
    unit: 'ms',
    dimension: 'small',
  },
} as const;

describe('diagnostics/perfMetrics', () => {
  it('parses a valid performance metric event', () => {
    expect(perfMetricDiagnosticEventSchema.parse(validMetricEvent)).toEqual(validMetricEvent);
  });

  it('rejects NaN metric values', () => {
    expect(perfMetricDiagnosticEventSchema.safeParse({
      ...validMetricEvent,
      context: {
        ...validMetricEvent.context,
        value: Number.NaN,
      },
    }).success).toBe(false);
  });

  it('rejects negative metric values', () => {
    expect(perfMetricDiagnosticEventSchema.safeParse({
      ...validMetricEvent,
      context: {
        ...validMetricEvent.context,
        value: -1,
      },
    }).success).toBe(false);
  });

  it('rejects a metric reported with the wrong unit', () => {
    expect(perfMetricDiagnosticEventSchema.safeParse({
      ...validMetricEvent,
      context: {
        ...validMetricEvent.context,
        unit: 'bytes',
      },
    }).success).toBe(false);
  });

  it('rejects unknown performance metric context fields', () => {
    expect(perfMetricDiagnosticEventSchema.safeParse({
      ...validMetricEvent,
      context: {
        ...validMetricEvent.context,
        unexpected: true,
      },
    }).success).toBe(false);
  });

  it('skips metric validation when there are no subscribers', () => {
    expect(emitPerfMetric({
      ...validMetricEvent.context,
      value: Number.NaN,
    })).toBeUndefined();
  });

  it('returns the validated diagnostic event when a metric is observed', () => {
    const subscription = onPerfMetric(() => {});

    try {
      expect(emitPerfMetric(validMetricEvent.context)).toEqual(validMetricEvent);
    } finally {
      subscription.dispose();
    }
  });

  it('notifies performance metric subscribers', () => {
    const received: PerfMetricDiagnosticEvent[] = [];
    const subscription = onPerfMetric(event => received.push(event));

    try {
      emitPerfMetric(validMetricEvent.context);

      expect(received).toEqual([validMetricEvent]);
    } finally {
      subscription.dispose();
    }
  });

  it('stops notifying a disposed performance metric subscription', () => {
    const received: PerfMetricDiagnosticEvent[] = [];
    const subscription = onPerfMetric(event => received.push(event));
    subscription.dispose();

    emitPerfMetric(validMetricEvent.context);

    expect(received).toEqual([]);
  });
});
