import { describe, expect, it } from 'vitest';
import {
  countExamples,
  hasAsyncWait,
  hasConcurrency,
  hasEnvMutation,
  hasFakeTimer,
  hasModuleMock
} from '../../../src/scrap/vitest/predicates';
import type { ScrapExampleMetric } from '../../../src/scrap/types';

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
    moduleMockCount: 0,
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

describe('vitest signal predicates', () => {
  describe('countExamples', () => {
    it('counts examples matching a predicate', () => {
      const examples = [
        example({ asyncWaitCount: 1 }),
        example({ asyncWaitCount: 0 }),
        example({ asyncWaitCount: 2 })
      ];

      const count = countExamples(examples, hasAsyncWait);

      expect(count).toBe(2);
    });

    it('returns 0 when no examples match', () => {
      const examples = [
        example({ asyncWaitCount: 0 }),
        example({ asyncWaitCount: 0 })
      ];

      const count = countExamples(examples, hasAsyncWait);

      expect(count).toBe(0);
    });
  });

  describe('individual predicates', () => {
    it('hasAsyncWait detects async wait count', () => {
      expect(hasAsyncWait(example({ asyncWaitCount: 1 }))).toBe(true);
      expect(hasAsyncWait(example({ asyncWaitCount: 0 }))).toBe(false);
      expect(hasAsyncWait(example({ asyncWaitCount: undefined }))).toBe(false);
    });

    it('hasConcurrency detects concurrency count', () => {
      expect(hasConcurrency(example({ concurrencyCount: 1 }))).toBe(true);
      expect(hasConcurrency(example({ concurrencyCount: 0 }))).toBe(false);
    });

    it('hasEnvMutation detects env mutation count', () => {
      expect(hasEnvMutation(example({ envMutationCount: 1 }))).toBe(true);
      expect(hasEnvMutation(example({ envMutationCount: 0 }))).toBe(false);
    });

    it('hasFakeTimer detects fake timer count', () => {
      expect(hasFakeTimer(example({ fakeTimerCount: 1 }))).toBe(true);
      expect(hasFakeTimer(example({ fakeTimerCount: 0 }))).toBe(false);
    });

    it('hasModuleMock detects module mock count', () => {
      expect(hasModuleMock(example({ moduleMockCount: 1 }))).toBe(true);
      expect(hasModuleMock(example({ moduleMockCount: 0 }))).toBe(false);
    });
  });
});
