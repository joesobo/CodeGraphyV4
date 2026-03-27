import { describe, expect, it } from 'vitest';
import { validationLines } from '../../src/scrap/reportValidation';
import type { ScrapFileMetric } from '../../src/scrap/scrapTypes';

function metric(overrides: Partial<ScrapFileMetric> = {}): ScrapFileMetric {
  return {
    averageScore: 1,
    blockSummaries: [],
    branchingExampleCount: 0,
    duplicateSetupExampleCount: 0,
    exampleCount: 1,
    filePath: '/repo/file.test.ts',
    helperHiddenExampleCount: 0,
    lowAssertionExampleCount: 0,
    maxScore: 1,
    remediationMode: 'STABLE',
    worstExamples: [],
    zeroAssertionExampleCount: 0,
    ...overrides
  };
}

describe('validationLines', () => {
  it('returns an empty list when there are no validation issues', () => {
    expect(validationLines(metric())).toEqual([]);
    expect(validationLines(metric({ validationIssues: [] }))).toEqual([]);
  });

  it('formats validation issue lines', () => {
    expect(validationLines(metric({
      validationIssues: [
        { kind: 'nested-test', line: 9, message: 'Nested test call inside another test body.' }
      ]
    }))).toEqual([
      '  validation:',
      '    - [nested-test] L9 Nested test call inside another test body.'
    ]);
  });
});
