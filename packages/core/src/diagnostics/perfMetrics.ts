import { z } from 'zod';

export const perfScenarioSchema = z.enum([
  'cold-open',
  'warm-open',
  'single-save',
  'rename',
  'create',
  'delete',
  'batch-100',
  'interaction-burst',
  'scope-toggle',
  'idle-watch',
]);

export const perfMetricNameSchema = z.enum([
  'coldOpenMs',
  'warmOpenMs',
  'incrementalRefreshMs',
  'payloadBytes',
  'watcherToGraphMs',
  'fileOpRoundtripMs',
  'layoutResets',
  'cacheSaveMs',
  'cacheBytes',
  'treeSitterParseMs',
  'graphBuildMs',
  'pluginActivationMs',
  'scopeToggleMs',
  'settleTimeMs',
  'idleCpuPct',
  'simTicksAfterSettle',
  'fpsIdle',
  'fpsDrag',
  'fpsSettle',
  'longTasksPerInteraction',
  'heapUsedBytes',
]);

export const perfMetricUnitSchema = z.enum([
  'ms',
  'bytes',
  'count',
  'fps',
  'percent',
]);

export type PerfScenario = z.infer<typeof perfScenarioSchema>;
export type PerfMetricName = z.infer<typeof perfMetricNameSchema>;
export type PerfMetricUnit = z.infer<typeof perfMetricUnitSchema>;

const expectedUnitByMetric: Readonly<Record<PerfMetricName, PerfMetricUnit>> = {
  coldOpenMs: 'ms',
  warmOpenMs: 'ms',
  incrementalRefreshMs: 'ms',
  payloadBytes: 'bytes',
  watcherToGraphMs: 'ms',
  fileOpRoundtripMs: 'ms',
  layoutResets: 'count',
  cacheSaveMs: 'ms',
  cacheBytes: 'bytes',
  treeSitterParseMs: 'ms',
  graphBuildMs: 'ms',
  pluginActivationMs: 'ms',
  scopeToggleMs: 'ms',
  settleTimeMs: 'ms',
  idleCpuPct: 'percent',
  simTicksAfterSettle: 'count',
  fpsIdle: 'fps',
  fpsDrag: 'fps',
  fpsSettle: 'fps',
  longTasksPerInteraction: 'count',
  heapUsedBytes: 'bytes',
};

export const perfMetricContextSchema = z.strictObject({
  runId: z.string().min(1),
  scenario: perfScenarioSchema,
  operationId: z.string().optional(),
  metric: perfMetricNameSchema,
  value: z.number().finite().nonnegative(),
  unit: perfMetricUnitSchema,
  dimension: z.string().optional(),
}).superRefine((context, issues) => {
  if (context.unit !== expectedUnitByMetric[context.metric]) {
    issues.addIssue({
      code: 'custom',
      path: ['unit'],
      message: `${context.metric} must use ${expectedUnitByMetric[context.metric]}`,
    });
  }
});

export const perfMetricDiagnosticEventSchema = z.strictObject({
  area: z.literal('performance'),
  event: z.literal('metric'),
  context: perfMetricContextSchema,
});

export type PerfMetricContext = z.infer<typeof perfMetricContextSchema>;
export type PerfMetricDiagnosticEvent = z.infer<typeof perfMetricDiagnosticEventSchema>;
export type PerfMetricListener = (event: PerfMetricDiagnosticEvent) => void;
export type PerfMetricSessionContext = Pick<
  PerfMetricContext,
  'runId' | 'scenario' | 'operationId' | 'dimension'
>;
export type ActivePerfMetric = Pick<
  PerfMetricContext,
  'metric' | 'value' | 'unit' | 'dimension'
>;
export type ActivePerfMetricEmitter = (
  metric: ActivePerfMetric,
) => PerfMetricDiagnosticEvent | undefined;

export interface PerfMetricSubscription {
  dispose(): void;
}

const perfMetricListeners = new Set<PerfMetricListener>();
interface PerfMetricSessionState {
  context: PerfMetricSessionContext;
  disposed: boolean;
  identity: object;
  previous: PerfMetricSessionState | undefined;
}

let activePerfMetricSession: PerfMetricSessionState | undefined;

export function emitPerfMetric(
  context: PerfMetricContext,
): PerfMetricDiagnosticEvent | undefined {
  if (perfMetricListeners.size === 0) {
    return undefined;
  }

  const event = perfMetricDiagnosticEventSchema.parse({
    area: 'performance',
    event: 'metric',
    context,
  });

  for (const listener of perfMetricListeners) {
    listener(event);
  }

  return event;
}

export function onPerfMetric(listener: PerfMetricListener): PerfMetricSubscription {
  perfMetricListeners.add(listener);

  return {
    dispose(): void {
      perfMetricListeners.delete(listener);
    },
  };
}

export function startPerfMetricSession(
  context: PerfMetricSessionContext,
): PerfMetricSubscription {
  const identity = {};
  const session: PerfMetricSessionState = {
    context,
    disposed: false,
    identity,
    previous: activePerfMetricSession,
  };
  activePerfMetricSession = session;

  return {
    dispose(): void {
      if (session.disposed) return;
      session.disposed = true;
      if (activePerfMetricSession?.identity !== identity) return;

      let previous = session.previous;
      while (previous?.disposed) {
        previous = previous.previous;
      }
      activePerfMetricSession = previous;
    },
  };
}

export function isPerfMetricCollectionActive(): boolean {
  return activePerfMetricSession !== undefined && perfMetricListeners.size > 0;
}

export function captureActivePerfMetricEmitter(): ActivePerfMetricEmitter | undefined {
  if (!activePerfMetricSession) {
    return undefined;
  }
  if (perfMetricListeners.size === 0) {
    return undefined;
  }

  const capturedContext = { ...activePerfMetricSession.context };
  return metric => emitPerfMetric({
    ...capturedContext,
    ...metric,
  });
}

export function emitActivePerfMetric(
  metric: ActivePerfMetric,
): PerfMetricDiagnosticEvent | undefined {
  if (!activePerfMetricSession) {
    return undefined;
  }
  if (perfMetricListeners.size === 0) {
    return undefined;
  }

  return emitPerfMetric({
    ...activePerfMetricSession.context,
    ...metric,
  });
}
