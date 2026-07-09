import { z } from 'zod';
import {
  perfMetricNameSchema,
  perfMetricUnitSchema,
} from '../../shared/perf/metrics';
import { perfScenarioSchema } from '../../shared/perf/protocol';
import {
  parsePerfScenarioComparison,
  perfScenarioComparisonSchema,
} from './explorer/comparison';

export const perfScenarioMetricSchema = z.strictObject({
  dimension: z.string().min(1).optional(),
  metric: perfMetricNameSchema,
  operationId: z.string().min(1).optional(),
  unit: perfMetricUnitSchema,
  value: z.number().finite().nonnegative(),
});

export const perfScenarioResultSchema = z.strictObject({
  comparison: perfScenarioComparisonSchema.optional(),
  runId: z.string().min(1),
  scenario: perfScenarioSchema,
  metrics: z.array(perfScenarioMetricSchema),
}).superRefine((result, issues) => {
  if (!result.comparison) return;
  try {
    parsePerfScenarioComparison(result.scenario, result.comparison);
  } catch {
    issues.addIssue({
      code: 'custom',
      path: ['comparison'],
      message: `Comparison payload does not match scenario ${result.scenario}`,
    });
  }
});

export type PerfScenarioResult = z.infer<typeof perfScenarioResultSchema>;
