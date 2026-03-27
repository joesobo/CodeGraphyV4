import { describe, expect, it } from 'vitest';
import { recommendedExtractionCount } from '../../src/scrap/recommendedExtractionCount';
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

describe('recommendedExtractionCount', () => {
  it('counts only unique repeated setup fingerprints with meaningful setup', () => {
    expect(recommendedExtractionCount([
      example({ duplicateSetupGroupSize: 2, setupFingerprint: 'shared-a', setupLineCount: 3 }),
      example({ duplicateSetupGroupSize: 3, setupFingerprint: 'shared-a', setupLineCount: 4 }),
      example({ duplicateSetupGroupSize: 2, setupFingerprint: 'shared-b', setupLineCount: 2 }),
      example({ duplicateSetupGroupSize: 1, setupFingerprint: 'shared-c', setupLineCount: 4 }),
      example({ duplicateSetupGroupSize: 2, setupLineCount: 4 }),
      example({ duplicateSetupGroupSize: 2, setupFingerprint: 'tiny', setupLineCount: 1 })
    ])).toBe(2);
  });
});
