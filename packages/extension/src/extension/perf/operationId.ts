import { z } from 'zod';
import {
  perfOperationSchema,
  perfScenarioSchema,
  type PerfOperation,
} from '../../shared/perf/protocol';

const operationInputSchema = z.strictObject({
  runId: z.string().trim().min(1),
  scenario: perfScenarioSchema,
  dimension: z.string().trim().min(1),
  ordinal: z.number().int().nonnegative(),
});

export function createPerfOperation(
  input: z.input<typeof operationInputSchema>,
): PerfOperation {
  const parsed = operationInputSchema.parse(input);
  return perfOperationSchema.parse({
    operationId: [
      parsed.runId,
      parsed.scenario,
      parsed.dimension,
      parsed.ordinal,
    ].join(':'),
    runId: parsed.runId,
    scenario: parsed.scenario,
    dimension: parsed.dimension,
  });
}
