import { type ScrapExampleMetric } from './scrapTypes';
import {
  assertionPressure,
  branchPressure,
  duplicateSetupPressure,
  helperHiddenPressure,
  linePressure,
  mockPressure,
  nestingPressure
} from './examplePressure';
import { vitestOperationalPressure } from './vitestPressure';

type ExampleScoreInput = Omit<ScrapExampleMetric, 'score'>;

export function scoreExample(metric: ExampleScoreInput): number {
  return linePressure(metric.lineCount) +
    duplicateSetupPressure(metric.duplicateSetupGroupSize, metric.setupLineCount) +
    helperHiddenPressure(metric.helperHiddenLineCount) +
    assertionPressure(metric.assertionCount) +
    branchPressure(metric.branchCount) +
    mockPressure(metric.mockCount) +
    nestingPressure(metric.describeDepth) +
    vitestOperationalPressure(
      metric.snapshotCount ?? 0,
      metric.asyncWaitCount ?? 0,
      metric.fakeTimerCount ?? 0,
      metric.envMutationCount ?? 0,
      metric.concurrencyCount ?? 0,
      metric.moduleMockCount ?? 0,
      metric.rtlRenderCount ?? 0,
      metric.rtlQueryCount ?? 0,
      metric.rtlMutationCount ?? 0
    ) +
    Math.max(0, (metric.setupDepth ?? 0) - 1) +
    Math.min(3, metric.tempResourceCount ?? 0);
}
