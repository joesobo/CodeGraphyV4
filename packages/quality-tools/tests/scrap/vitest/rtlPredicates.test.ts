import { describe, expect, it } from 'vitest';
import {
  hasRtlMutation,
  isRtlQueryHeavy,
  hasRtlRender,
  hasSnapshot,
  hasTypeOnlyAssertion
} from '../../../src/scrap/vitest/rtlPredicates';
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

describe('vitest RTL and assertion signal predicates', () => {
  describe('hasRtlMutation', () => {
    it('detects RTL mutation count', () => {
      expect(hasRtlMutation(example({ rtlMutationCount: 1 }))).toBe(true);
      expect(hasRtlMutation(example({ rtlMutationCount: 0 }))).toBe(false);
    });

    it('handles undefined as zero', () => {
      expect(hasRtlMutation(example({ rtlMutationCount: undefined }))).toBe(false);
    });
  });

  describe('hasRtlRender', () => {
    it('detects RTL render count', () => {
      expect(hasRtlRender(example({ rtlRenderCount: 1 }))).toBe(true);
      expect(hasRtlRender(example({ rtlRenderCount: 0 }))).toBe(false);
    });

    it('handles undefined as zero', () => {
      expect(hasRtlRender(example({ rtlRenderCount: undefined }))).toBe(false);
    });
  });

  describe('hasSnapshot', () => {
    it('detects snapshot count', () => {
      expect(hasSnapshot(example({ snapshotCount: 1 }))).toBe(true);
      expect(hasSnapshot(example({ snapshotCount: 0 }))).toBe(false);
    });

    it('handles undefined as zero', () => {
      expect(hasSnapshot(example({ snapshotCount: undefined }))).toBe(false);
    });
  });

  describe('hasTypeOnlyAssertion', () => {
    it('detects type-only assertion count', () => {
      expect(hasTypeOnlyAssertion(example({ typeOnlyAssertionCount: 1 }))).toBe(true);
      expect(hasTypeOnlyAssertion(example({ typeOnlyAssertionCount: 0 }))).toBe(false);
    });

    it('handles undefined as zero', () => {
      expect(hasTypeOnlyAssertion(example({ typeOnlyAssertionCount: undefined }))).toBe(false);
    });
  });

  describe('isRtlQueryHeavy', () => {
    it('detects examples with render, 3+ queries, and no mutations', () => {
      expect(
        isRtlQueryHeavy(example({ rtlRenderCount: 1, rtlQueryCount: 3, rtlMutationCount: 0 }))
      ).toBe(true);
    });

    it('requires render > 0', () => {
      expect(
        isRtlQueryHeavy(example({ rtlRenderCount: 0, rtlQueryCount: 3, rtlMutationCount: 0 }))
      ).toBe(false);
    });

    it('requires query count >= 3', () => {
      expect(
        isRtlQueryHeavy(example({ rtlRenderCount: 1, rtlQueryCount: 2, rtlMutationCount: 0 }))
      ).toBe(false);
    });

    it('requires mutation count === 0', () => {
      expect(
        isRtlQueryHeavy(example({ rtlRenderCount: 1, rtlQueryCount: 3, rtlMutationCount: 1 }))
      ).toBe(false);
    });

    it('handles undefined counts as zero', () => {
      expect(
        isRtlQueryHeavy(example({ rtlRenderCount: 1, rtlQueryCount: 3, rtlMutationCount: undefined }))
      ).toBe(true);
    });

    it('handles all undefined RTL counts', () => {
      expect(
        isRtlQueryHeavy(example({
          rtlRenderCount: undefined,
          rtlQueryCount: undefined,
          rtlMutationCount: undefined
        }))
      ).toBe(false);
    });
  });
});
