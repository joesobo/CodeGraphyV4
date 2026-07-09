import { z } from 'zod';
import type { PerfScenario } from '../../../shared/perf/protocol';

const measurementSchema = z.number().finite().nonnegative();

export const renamePerfScenarioComparisonSchema = z.strictObject({
  codeGraphyRevealMs: measurementSchema,
  explorer: z.strictObject({
    explorerRenameMs: measurementSchema,
    explorerRevealMs: measurementSchema,
  }),
});

export const createPerfScenarioComparisonSchema = z.strictObject({
  explorer: z.strictObject({
    explorerCreateMs: measurementSchema,
  }),
});

export const deletePerfScenarioComparisonSchema = z.strictObject({
  explorer: z.strictObject({
    explorerDeleteMs: measurementSchema,
  }),
});

export const perfScenarioComparisonSchema = z.union([
  renamePerfScenarioComparisonSchema,
  createPerfScenarioComparisonSchema,
  deletePerfScenarioComparisonSchema,
]);

export type PerfScenarioComparison = z.infer<typeof perfScenarioComparisonSchema>;

export function parsePerfScenarioComparison(
  scenario: PerfScenario,
  value: unknown,
): PerfScenarioComparison {
  switch (scenario) {
    case 'rename':
      return renamePerfScenarioComparisonSchema.parse(value);
    case 'create':
      return createPerfScenarioComparisonSchema.parse(value);
    case 'delete':
      return deletePerfScenarioComparisonSchema.parse(value);
    default:
      throw new Error(
        `Performance scenario ${scenario} does not support an Explorer comparison payload`,
      );
  }
}
