import { type ScrapExampleMetric } from '../../types';

export function hasLowNoiseStructure(example: ScrapExampleMetric): boolean {
  return example.branchCount <= 1 &&
    example.helperHiddenLineCount === 0 &&
    example.mockCount === 0;
}

export function hasCompactCoverageShape(example: ScrapExampleMetric): boolean {
  return example.lineCount <= 12 &&
    (example.setupLineCount ?? 0) <= 3 &&
    (example.tempResourceCount ?? 0) <= 1 &&
    example.assertionCount >= 1;
}

export function isSimpleCoverageMatrixShape(example: ScrapExampleMetric): boolean {
  return hasLowNoiseStructure(example) && hasCompactCoverageShape(example);
}
