import { type ScrapExampleMetric } from '../types';

export interface ExampleCountSummary {
  branchingExampleCount: number;
  duplicateSetupGroupSizes: number[];
  helperHiddenExampleCount: number;
  lowAssertionExampleCount: number;
  tableDrivenExampleCount: number;
  tempResourceExampleCount: number;
  zeroAssertionExampleCount: number;
}

function countExamples(
  examples: ScrapExampleMetric[],
  predicate: (example: ScrapExampleMetric) => boolean
): number {
  return examples.filter(predicate).length;
}

export function summarizeExampleCounts(examples: ScrapExampleMetric[]): ExampleCountSummary {
  return {
    branchingExampleCount: countExamples(examples, (example) => example.branchCount > 0),
    duplicateSetupGroupSizes: examples.map((example) => example.duplicateSetupGroupSize),
    helperHiddenExampleCount: countExamples(examples, (example) => example.helperHiddenLineCount > 0),
    lowAssertionExampleCount: countExamples(examples, (example) => example.assertionCount <= 1),
    tableDrivenExampleCount: countExamples(examples, (example) => example.tableDriven === true),
    tempResourceExampleCount: countExamples(examples, (example) => (example.tempResourceCount ?? 0) > 0),
    zeroAssertionExampleCount: countExamples(examples, (example) => example.assertionCount === 0)
  };
}
