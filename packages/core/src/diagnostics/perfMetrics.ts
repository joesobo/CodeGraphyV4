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
  'scopeToggleMs',
  'settleTimeMs',
  'idleCpuPct',
  'simTicksAfterSettle',
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
  scopeToggleMs: 'ms',
  settleTimeMs: 'ms',
  idleCpuPct: 'percent',
  simTicksAfterSettle: 'count',
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

export interface PerfMetricSubscription {
  dispose(): void;
}

const perfMetricListeners = new Set<PerfMetricListener>();

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
