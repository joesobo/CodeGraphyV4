import { type ScrapExampleMetric } from '../types';

export function countExamples(
  examples: ScrapExampleMetric[],
  predicate: (example: ScrapExampleMetric) => boolean
): number {
  return examples.filter(predicate).length;
}

export function hasAsyncWait(ex: ScrapExampleMetric): boolean {
  return (ex.asyncWaitCount ?? 0) > 0;
}

export function hasConcurrency(ex: ScrapExampleMetric): boolean {
  return (ex.concurrencyCount ?? 0) > 0;
}

export function hasEnvMutation(ex: ScrapExampleMetric): boolean {
  return (ex.envMutationCount ?? 0) > 0;
}

export function hasFakeTimer(ex: ScrapExampleMetric): boolean {
  return (ex.fakeTimerCount ?? 0) > 0;
}

export function hasModuleMock(ex: ScrapExampleMetric): boolean {
  return (ex.moduleMockCount ?? 0) > 0;
}
