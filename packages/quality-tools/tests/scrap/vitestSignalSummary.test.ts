import { describe, expect, it } from 'vitest';
import { summarizeVitestSignals } from '../../src/scrap/vitestSignalSummary';
import type { ScrapExampleMetric } from '../../src/scrap/scrapTypes';

function example(overrides: Partial<ScrapExampleMetric> = {}): ScrapExampleMetric {
  return {
    assertionCount: 2,
    asyncWaitCount: 0,
    blockPath: ['suite'],
    branchCount: 0,
    concurrencyCount: 0,
    describeDepth: 1,
    duplicateSetupGroupSize: 0,
    endLine: 5,
    envMutationCount: 0,
    fakeTimerCount: 0,
    helperCallCount: 0,
    helperHiddenLineCount: 0,
    lineCount: 4,
    mockCount: 0,
    name: 'example',
    score: 2,
    setupLineCount: 0,
    snapshotCount: 0,
    startLine: 1,
    typeOnlyAssertionCount: 0,
    ...overrides
  };
}

describe('summarizeVitestSignals', () => {
  it('counts example-level Vitest operational signals', () => {
    expect(summarizeVitestSignals([
      example({ asyncWaitCount: 1, snapshotCount: 1 }),
      example({ concurrencyCount: 1, fakeTimerCount: 1 }),
      example({ envMutationCount: 1, typeOnlyAssertionCount: 1 })
    ])).toEqual({
      asyncWaitExampleCount: 1,
      concurrencyExampleCount: 1,
      envMutationExampleCount: 1,
      fakeTimerExampleCount: 1,
      snapshotExampleCount: 1,
      typeOnlyAssertionExampleCount: 1
    });
  });
});
