import { describe, expect, it } from 'vitest';
import { hasCompactCoverageShape, hasLowNoiseStructure, isSimpleCoverageMatrixShape } from '../../../../src/scrap/metrics/matrix/shape';
import type { ScrapExampleMetric } from '../../../../src/scrap/types';

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

describe('coverageMatrixShape', () => {
  it('treats low-noise examples as branch-light, helper-light, and mock-free', () => {
    expect(hasLowNoiseStructure(example())).toBe(true);
    expect(hasLowNoiseStructure(example({ branchCount: 2 }))).toBe(false);
    expect(hasLowNoiseStructure(example({ helperHiddenLineCount: 1 }))).toBe(false);
    expect(hasLowNoiseStructure(example({ mockCount: 1 }))).toBe(false);
  });

  it('treats compact coverage shapes as short, setup-light, low-temp-resource, and asserted', () => {
    expect(hasCompactCoverageShape(example({ lineCount: 12, setupLineCount: 3, tempResourceCount: 1 }))).toBe(true);
    expect(hasCompactCoverageShape(example({ lineCount: 13 }))).toBe(false);
    expect(hasCompactCoverageShape(example({ setupLineCount: 4 }))).toBe(false);
    expect(hasCompactCoverageShape(example({ tempResourceCount: 2 }))).toBe(false);
    expect(hasCompactCoverageShape(example({ assertionCount: 0 }))).toBe(false);
  });

  it('requires both the low-noise structure and compact shape for simple coverage matrices', () => {
    expect(isSimpleCoverageMatrixShape(example({ lineCount: 10, setupLineCount: 2 }))).toBe(true);
    expect(isSimpleCoverageMatrixShape(example({ lineCount: 13 }))).toBe(false);
    expect(isSimpleCoverageMatrixShape(example({ mockCount: 1 }))).toBe(false);
  });
});
