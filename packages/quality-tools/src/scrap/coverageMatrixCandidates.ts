import { type ScrapExampleMetric } from './scrapTypes';

function isSimpleCoverageMatrixShape(example: ScrapExampleMetric): boolean {
  return example.branchCount <= 1 &&
    example.helperHiddenLineCount === 0 &&
    example.mockCount === 0 &&
    example.lineCount <= 8 &&
    example.assertionCount >= 1;
}

export function isCoverageMatrixCandidate(
  example: ScrapExampleMetric,
  duplicateSize: number
): boolean {
  return duplicateSize > 1 && (example.tableDriven === true || isSimpleCoverageMatrixShape(example));
}

export function coverageMatrixCandidateCount(
  examples: ScrapExampleMetric[],
  exampleGroupSizes: number[]
): number {
  return examples.filter((example, index) => (
    isCoverageMatrixCandidate(example, exampleGroupSizes[index] ?? 0)
  )).length;
}
