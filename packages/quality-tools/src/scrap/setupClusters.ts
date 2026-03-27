import { type ScrapExampleMetric } from './scrapTypes';

export function isRepeatedSetupExample(example: ScrapExampleMetric): boolean {
  return example.duplicateSetupGroupSize > 1 &&
    example.setupLineCount >= 2 &&
    typeof example.setupFingerprint === 'string';
}

function repeatedSetupExamples(examples: ScrapExampleMetric[]): ScrapExampleMetric[] {
  return examples.filter(isRepeatedSetupExample);
}

export function groupSetupExamples(examples: ScrapExampleMetric[]): ScrapExampleMetric[][] {
  const clusters = new Map<string, ScrapExampleMetric[]>();

  repeatedSetupExamples(examples).forEach((example) => {
    const fingerprint = example.setupFingerprint!;
    const cluster = clusters.get(fingerprint) ?? [];
    cluster.push(example);
    clusters.set(fingerprint, cluster);
  });

  return [...clusters.values()];
}

export function strongestSetupCluster(examples: ScrapExampleMetric[]): ScrapExampleMetric[] {
  return groupSetupExamples(examples)
    .sort((left, right) => right.length - left.length)[0] ?? [];
}

export function coverageRelevantExamples(examples: ScrapExampleMetric[]): ScrapExampleMetric[] {
  return examples.filter((example) =>
    example.tableDriven === true ||
    !!example.literalShapeFingerprint ||
    !!example.fixtureFingerprint
  );
}
