import { type ScrapExampleMetric } from './scrapTypes';

export interface VitestSignalSummary {
  asyncWaitExampleCount: number;
  concurrencyExampleCount: number;
  envMutationExampleCount: number;
  fakeTimerExampleCount: number;
  snapshotExampleCount: number;
  typeOnlyAssertionExampleCount: number;
}

function countExamples(
  examples: ScrapExampleMetric[],
  predicate: (example: ScrapExampleMetric) => boolean
): number {
  return examples.filter(predicate).length;
}

export function summarizeVitestSignals(examples: ScrapExampleMetric[]): VitestSignalSummary {
  return {
    asyncWaitExampleCount: countExamples(examples, (example) => (example.asyncWaitCount ?? 0) > 0),
    concurrencyExampleCount: countExamples(examples, (example) => (example.concurrencyCount ?? 0) > 0),
    envMutationExampleCount: countExamples(examples, (example) => (example.envMutationCount ?? 0) > 0),
    fakeTimerExampleCount: countExamples(examples, (example) => (example.fakeTimerCount ?? 0) > 0),
    snapshotExampleCount: countExamples(examples, (example) => (example.snapshotCount ?? 0) > 0),
    typeOnlyAssertionExampleCount: countExamples(examples, (example) => (example.typeOnlyAssertionCount ?? 0) > 0)
  };
}
