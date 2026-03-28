import { type ScrapExampleMetric } from '../types';
import {
  assertionPressure,
  branchPressure,
  duplicateSetupPressure,
  helperHiddenPressure,
  linePressure,
  mockPressure,
  nestingPressure
} from '../example/calls/pressure';
import { vitestOperationalPressure } from '../vitest/pressure';

type ExampleScoreInput = Omit<ScrapExampleMetric, 'score'>;

function structuralPressures(metric: ExampleScoreInput): number {
  return (
    linePressure(metric.lineCount) +
    branchPressure(metric.branchCount) +
    nestingPressure(metric.describeDepth)
  );
}

function setupRelatedPressures(metric: ExampleScoreInput): number {
  return (
    duplicateSetupPressure(metric.duplicateSetupGroupSize, metric.setupLineCount) +
    Math.max(0, defaultZero(metric.setupDepth) - 1)
  );
}

function qualityPressures(metric: ExampleScoreInput): number {
  return (
    helperHiddenPressure(metric.helperHiddenLineCount) +
    assertionPressure(metric.assertionCount) +
    mockPressure(metric.mockCount)
  );
}

function defaultZero(value: number | undefined): number {
  return value ?? 0;
}

function operationalPressures(metric: ExampleScoreInput): number {
  const vitestPressure = vitestOperationalPressure(
    defaultZero(metric.snapshotCount),
    defaultZero(metric.asyncWaitCount),
    defaultZero(metric.fakeTimerCount),
    defaultZero(metric.envMutationCount),
    defaultZero(metric.concurrencyCount),
    defaultZero(metric.moduleMockCount),
    defaultZero(metric.rtlRenderCount),
    defaultZero(metric.rtlQueryCount),
    defaultZero(metric.rtlMutationCount)
  );
  return vitestPressure + Math.min(3, defaultZero(metric.tempResourceCount));
}

export function scoreExample(metric: ExampleScoreInput): number {
  return (
    structuralPressures(metric) +
    setupRelatedPressures(metric) +
    qualityPressures(metric) +
    operationalPressures(metric)
  );
}
