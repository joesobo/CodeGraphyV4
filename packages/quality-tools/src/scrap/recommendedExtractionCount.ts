import { type ScrapExampleMetric } from './scrapTypes';

function isExtractableSetup(example: ScrapExampleMetric): boolean {
  return example.duplicateSetupGroupSize > 1 &&
    example.setupLineCount >= 2 &&
    typeof example.setupFingerprint === 'string';
}

export function recommendedExtractionCount(examples: ScrapExampleMetric[]): number {
  return new Set(
    examples
      .filter(isExtractableSetup)
      .map((example) => example.setupFingerprint)
  ).size;
}
