import { describe, expect, it } from 'vitest';
import { summarizeBlockPaths, summarizeHelperGroups, summarizeValues } from '../../src/scrap/recommendationText';
import type { ScrapExampleMetric } from '../../src/scrap/scrapTypes';

function example(overrides: Partial<ScrapExampleMetric> = {}): ScrapExampleMetric {
  return {
    assertionCount: 1,
    blockPath: ['suite'],
    branchCount: 0,
    describeDepth: 1,
    duplicateSetupGroupSize: 0,
    endLine: 5,
    helperCallCount: 0,
    helperHiddenLineCount: 0,
    lineCount: 4,
    mockCount: 0,
    name: 'example',
    score: 2,
    setupLineCount: 0,
    startLine: 1,
    ...overrides
  };
}

describe('recommendationText', () => {
  it('summarizes up to three unique non-empty values', () => {
    expect(summarizeValues('Groups', ['', 'a', 'b', 'a', 'c', 'd'])).toBe(' Groups: a, b, c.');
  });

  it('returns an empty string when there is nothing to summarize', () => {
    expect(summarizeValues('Groups', ['', ''])).toBe('');
  });

  it('summarizes affected block paths from examples', () => {
    expect(summarizeBlockPaths([
      example({ blockPath: ['suite', 'first'] }),
      example({ blockPath: ['suite', 'second'] })
    ])).toBe(' Affected blocks: suite > first, suite > second.');
  });

  it('summarizes unique helper group names from examples', () => {
    expect(summarizeHelperGroups([
      example({ setupSubjectNames: ['createRepo', 'seedRepo'] }),
      example({ setupSubjectNames: ['createRepo', ''] })
    ])).toBe(' Helper groups: createRepo, seedRepo.');
  });
});
