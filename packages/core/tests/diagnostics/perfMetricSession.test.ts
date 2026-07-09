import { describe, expect, it } from 'vitest';
import {
  captureActivePerfMetricEmitter,
  emitActivePerfMetric,
  isPerfMetricCollectionActive,
  onPerfMetric,
  startPerfMetricSession,
  type PerfMetricDiagnosticEvent,
} from '../../src/diagnostics/perfMetrics';

describe('diagnostics/perfMetricSession', () => {
  it('attaches active session context to collected metrics', () => {
    const received: PerfMetricDiagnosticEvent[] = [];
    const subscription = onPerfMetric(event => received.push(event));
    const session = startPerfMetricSession({
      runId: 'run-2',
      scenario: 'single-save',
      operationId: 'save-1',
    });

    try {
      emitActivePerfMetric({
        metric: 'treeSitterParseMs',
        value: 12,
        unit: 'ms',
        dimension: 'typescript',
      });

      expect(received).toEqual([{
        area: 'performance',
        event: 'metric',
        context: {
          runId: 'run-2',
          scenario: 'single-save',
          operationId: 'save-1',
          metric: 'treeSitterParseMs',
          value: 12,
          unit: 'ms',
          dimension: 'typescript',
        },
      }]);
    } finally {
      session.dispose();
      subscription.dispose();
    }
  });

  it('inherits the active session dimension when a metric has none', () => {
    const received: PerfMetricDiagnosticEvent[] = [];
    const subscription = onPerfMetric(event => received.push(event));
    const session = startPerfMetricSession({
      runId: 'run-dimension',
      scenario: 'cold-open',
      dimension: 'medium',
    });

    try {
      emitActivePerfMetric({
        metric: 'graphBuildMs',
        value: 8,
        unit: 'ms',
      });

      expect(received[0]?.context.dimension).toBe('medium');
    } finally {
      session.dispose();
      subscription.dispose();
    }
  });

  it('keeps captured metric context after the active session is replaced', async () => {
    const received: PerfMetricDiagnosticEvent[] = [];
    const subscription = onPerfMetric(event => received.push(event));
    const capturedSession = startPerfMetricSession({
      runId: 'run-captured',
      scenario: 'single-save',
      operationId: 'save-old',
      dimension: 'medium',
    });
    let replacementSession: ReturnType<typeof startPerfMetricSession> | undefined;

    try {
      const capturedEmitter = captureActivePerfMetricEmitter();
      replacementSession = startPerfMetricSession({
        runId: 'run-replacement',
        scenario: 'warm-open',
        operationId: 'open-new',
        dimension: 'large',
      });
      await Promise.resolve().then(() => capturedEmitter?.({
        metric: 'incrementalRefreshMs',
        value: 11,
        unit: 'ms',
      }));

      expect(received.map(event => event.context)).toEqual([{
        runId: 'run-captured',
        scenario: 'single-save',
        operationId: 'save-old',
        dimension: 'medium',
        metric: 'incrementalRefreshMs',
        value: 11,
        unit: 'ms',
      }]);
    } finally {
      capturedSession.dispose();
      replacementSession?.dispose();
      subscription.dispose();
    }
  });

  it('does not capture an emitter while metric collection is unarmed', () => {
    expect(captureActivePerfMetricEmitter()).toBeUndefined();
  });

  it('does not capture an emitter without a metric subscriber', () => {
    const session = startPerfMetricSession({
      runId: 'run-without-subscriber',
      scenario: 'single-save',
    });

    try {
      expect(captureActivePerfMetricEmitter()).toBeUndefined();
    } finally {
      session.dispose();
    }
  });

  it('keeps a replacement session active when the replaced session is disposed', () => {
    const received: PerfMetricDiagnosticEvent[] = [];
    const subscription = onPerfMetric(event => received.push(event));
    const replacedSession = startPerfMetricSession({
      runId: 'run-replaced',
      scenario: 'cold-open',
    });
    const activeSession = startPerfMetricSession({
      runId: 'run-active',
      scenario: 'warm-open',
    });

    try {
      replacedSession.dispose();
      emitActivePerfMetric({
        metric: 'warmOpenMs',
        value: 20,
        unit: 'ms',
      });

      expect(received.map(event => event.context.runId)).toEqual(['run-active']);
    } finally {
      activeSession.dispose();
      subscription.dispose();
    }
  });

  it('restores the parent session when a nested session is disposed', () => {
    const received: PerfMetricDiagnosticEvent[] = [];
    const subscription = onPerfMetric(event => received.push(event));
    const parentSession = startPerfMetricSession({
      runId: 'run-parent',
      scenario: 'rename',
      dimension: 'small',
    });
    const operationSession = startPerfMetricSession({
      runId: 'run-parent',
      scenario: 'rename',
      operationId: 'run-parent:rename:small:0',
      dimension: 'small',
    });

    try {
      operationSession.dispose();
      emitActivePerfMetric({
        metric: 'incrementalRefreshMs',
        value: 12,
        unit: 'ms',
      });

      expect(received[0]?.context).toMatchObject({
        runId: 'run-parent',
        scenario: 'rename',
        dimension: 'small',
      });
      expect(received[0]?.context.operationId).toBeUndefined();
    } finally {
      parentSession.dispose();
      subscription.dispose();
    }
  });

  it('skips active metric validation when no session is armed', () => {
    expect(emitActivePerfMetric({
      metric: 'treeSitterParseMs',
      value: Number.NaN,
      unit: 'ms',
    })).toBeUndefined();
  });

  it('stops collecting metrics when the active session is disposed', () => {
    const received: PerfMetricDiagnosticEvent[] = [];
    const subscription = onPerfMetric(event => received.push(event));
    const session = startPerfMetricSession({
      runId: 'run-disposed',
      scenario: 'single-save',
    });
    session.dispose();

    try {
      emitActivePerfMetric({
        metric: 'treeSitterParseMs',
        value: 5,
        unit: 'ms',
      });

      expect(received).toEqual([]);
    } finally {
      subscription.dispose();
    }
  });

  it('arms collection only while a session has a subscriber', () => {
    expect(isPerfMetricCollectionActive()).toBe(false);
    const session = startPerfMetricSession({
      runId: 'run-armed',
      scenario: 'cold-open',
    });

    try {
      expect(isPerfMetricCollectionActive()).toBe(false);
      const subscription = onPerfMetric(() => {});

      try {
        expect(isPerfMetricCollectionActive()).toBe(true);
      } finally {
        subscription.dispose();
      }

      expect(isPerfMetricCollectionActive()).toBe(false);
    } finally {
      session.dispose();
    }
  });
});
