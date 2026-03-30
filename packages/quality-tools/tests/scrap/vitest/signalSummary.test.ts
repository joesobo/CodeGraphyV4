import { describe, expect, it } from 'vitest';
import { summarizeVitestSignals } from '../../../src/scrap/vitest/signalSummary';
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
      moduleMockExampleCount: 0,
      rtlMutationExampleCount: 0,
      rtlQueryHeavyExampleCount: 0,
      rtlRenderExampleCount: 0,
      snapshotExampleCount: 1,
      typeOnlyAssertionExampleCount: 1
    });
  });

  it('counts examples with module mock lifecycle work', () => {
    expect(summarizeVitestSignals([
      example({ moduleMockCount: 2 }),
      example({ moduleMockCount: 0 })
    ]).moduleMockExampleCount).toBe(1);
  });

  describe('rtlMutation detection', () => {
    it('counts examples with RTL mutation', () => {
      expect(summarizeVitestSignals([
        example({ rtlMutationCount: 1 })
      ]).rtlMutationExampleCount).toBe(1);
    });

    it('does not count examples without RTL mutation', () => {
      expect(summarizeVitestSignals([
        example({ rtlMutationCount: 0 })
      ]).rtlMutationExampleCount).toBe(0);
    });

    it('handles undefined rtlMutationCount as zero', () => {
      expect(summarizeVitestSignals([
        example({ rtlMutationCount: undefined })
      ]).rtlMutationExampleCount).toBe(0);
    });
  });

  describe('rtlRender detection', () => {
    it('counts examples with RTL render', () => {
      expect(summarizeVitestSignals([
        example({ rtlRenderCount: 1 })
      ]).rtlRenderExampleCount).toBe(1);
    });

    it('counts examples with multiple RTL renders', () => {
      expect(summarizeVitestSignals([
        example({ rtlRenderCount: 5 })
      ]).rtlRenderExampleCount).toBe(1);
    });

    it('does not count examples without RTL render', () => {
      expect(summarizeVitestSignals([
        example({ rtlRenderCount: 0 })
      ]).rtlRenderExampleCount).toBe(0);
    });

    it('handles undefined rtlRenderCount as zero', () => {
      expect(summarizeVitestSignals([
        example({ rtlRenderCount: undefined })
      ]).rtlRenderExampleCount).toBe(0);
    });
  });

  describe('rtlQueryHeavy detection', () => {
    it('counts examples with render, 3+ queries, and no mutations', () => {
      expect(summarizeVitestSignals([
        example({ rtlRenderCount: 1, rtlQueryCount: 3, rtlMutationCount: 0 })
      ]).rtlQueryHeavyExampleCount).toBe(1);
    });

    it('counts examples with render and 4+ queries and no mutations', () => {
      expect(summarizeVitestSignals([
        example({ rtlRenderCount: 1, rtlQueryCount: 4, rtlMutationCount: 0 })
      ]).rtlQueryHeavyExampleCount).toBe(1);
    });

    it('counts examples with render and 5 queries', () => {
      expect(summarizeVitestSignals([
        example({ rtlRenderCount: 1, rtlQueryCount: 5, rtlMutationCount: 0 })
      ]).rtlQueryHeavyExampleCount).toBe(1);
    });

    it('counts examples with multiple renders and sufficient queries', () => {
      expect(summarizeVitestSignals([
        example({ rtlRenderCount: 2, rtlQueryCount: 3, rtlMutationCount: 0 })
      ]).rtlQueryHeavyExampleCount).toBe(1);
    });

    it('counts examples with render and exactly 3 queries', () => {
      expect(summarizeVitestSignals([
        example({ rtlRenderCount: 1, rtlQueryCount: 3, rtlMutationCount: 0 })
      ]).rtlQueryHeavyExampleCount).toBe(1);
    });

    it('does not count when render is zero', () => {
      expect(summarizeVitestSignals([
        example({ rtlRenderCount: 0, rtlQueryCount: 3, rtlMutationCount: 0 })
      ]).rtlQueryHeavyExampleCount).toBe(0);
    });

    it('does not count when query count is less than 3', () => {
      expect(summarizeVitestSignals([
        example({ rtlRenderCount: 1, rtlQueryCount: 2, rtlMutationCount: 0 })
      ]).rtlQueryHeavyExampleCount).toBe(0);
    });

    it('does not count when query count is exactly 2', () => {
      expect(summarizeVitestSignals([
        example({ rtlRenderCount: 1, rtlQueryCount: 2, rtlMutationCount: 0 })
      ]).rtlQueryHeavyExampleCount).toBe(0);
    });

    it('does not count when query count is zero', () => {
      expect(summarizeVitestSignals([
        example({ rtlRenderCount: 1, rtlQueryCount: 0, rtlMutationCount: 0 })
      ]).rtlQueryHeavyExampleCount).toBe(0);
    });

    it('does not count when query count is one', () => {
      expect(summarizeVitestSignals([
        example({ rtlRenderCount: 1, rtlQueryCount: 1, rtlMutationCount: 0 })
      ]).rtlQueryHeavyExampleCount).toBe(0);
    });

    it('does not count when mutations are present with count of one', () => {
      expect(summarizeVitestSignals([
        example({ rtlRenderCount: 1, rtlQueryCount: 3, rtlMutationCount: 1 })
      ]).rtlQueryHeavyExampleCount).toBe(0);
    });

    it('does not count when mutation count is greater than zero', () => {
      expect(summarizeVitestSignals([
        example({ rtlRenderCount: 1, rtlQueryCount: 3, rtlMutationCount: 2 })
      ]).rtlQueryHeavyExampleCount).toBe(0);
    });

    it('does not count when mutation count is greater than one', () => {
      expect(summarizeVitestSignals([
        example({ rtlRenderCount: 1, rtlQueryCount: 3, rtlMutationCount: 5 })
      ]).rtlQueryHeavyExampleCount).toBe(0);
    });

    it('handles undefined render count as zero', () => {
      expect(summarizeVitestSignals([
        example({ rtlRenderCount: undefined, rtlQueryCount: 3, rtlMutationCount: 0 })
      ]).rtlQueryHeavyExampleCount).toBe(0);
    });

    it('handles undefined query count as zero', () => {
      expect(summarizeVitestSignals([
        example({ rtlRenderCount: 1, rtlQueryCount: undefined, rtlMutationCount: 0 })
      ]).rtlQueryHeavyExampleCount).toBe(0);
    });

    it('handles undefined mutation count as zero', () => {
      expect(summarizeVitestSignals([
        example({ rtlRenderCount: 1, rtlQueryCount: 3, rtlMutationCount: undefined })
      ]).rtlQueryHeavyExampleCount).toBe(1);
    });

    it('discriminates between render and query conditions', () => {
      const results = summarizeVitestSignals([
        example({ rtlRenderCount: 1, rtlQueryCount: 2, rtlMutationCount: 0 }),
        example({ rtlRenderCount: 0, rtlQueryCount: 3, rtlMutationCount: 0 }),
        example({ rtlRenderCount: 1, rtlQueryCount: 3, rtlMutationCount: 0 })
      ]);
      expect(results.rtlQueryHeavyExampleCount).toBe(1);
    });

    it('requires all three conditions to be true simultaneously', () => {
      const results = summarizeVitestSignals([
        example({ rtlRenderCount: 1, rtlQueryCount: 3, rtlMutationCount: 0 }),
        example({ rtlRenderCount: 0, rtlQueryCount: 3, rtlMutationCount: 0 }),
        example({ rtlRenderCount: 1, rtlQueryCount: 2, rtlMutationCount: 0 }),
        example({ rtlRenderCount: 1, rtlQueryCount: 3, rtlMutationCount: 1 })
      ]);
      expect(results.rtlQueryHeavyExampleCount).toBe(1);
    });

    it('does not count with render=0 even with many queries and no mutations', () => {
      expect(summarizeVitestSignals([
        example({ rtlRenderCount: 0, rtlQueryCount: 10, rtlMutationCount: 0 })
      ]).rtlQueryHeavyExampleCount).toBe(0);
    });

    it('does not count with mutation=1 even with render and sufficient queries', () => {
      expect(summarizeVitestSignals([
        example({ rtlRenderCount: 1, rtlQueryCount: 10, rtlMutationCount: 1 })
      ]).rtlQueryHeavyExampleCount).toBe(0);
    });
  });
});
