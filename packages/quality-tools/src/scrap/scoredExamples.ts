import * as ts from 'typescript';
import { analyzeExample } from './exampleMetrics';
import { analyzeExampleSetup } from './exampleSetup';
import { findExamples } from './findExamples';
import { scoreExample } from './scoreExample';
import { duplicateSetupGroupSizes } from './setupDuplicates';
import { type ScrapExampleMetric } from './scrapTypes';

export function analyzeFileExamples(sourceFile: ts.SourceFile): ScrapExampleMetric[] {
  const examples = findExamples(sourceFile);
  const setupMetrics = examples.map((example) => analyzeExampleSetup(sourceFile, example));
  const duplicateGroupSizes = duplicateSetupGroupSizes(setupMetrics);

  return examples.map((example, index) => {
    const metric = analyzeExample(sourceFile, example, setupMetrics[index]);
    const duplicateSetupGroupSize = duplicateGroupSizes[index] ?? 0;

    return {
      ...metric,
      duplicateSetupGroupSize,
      score: scoreExample({
        ...metric,
        duplicateSetupGroupSize
      })
    };
  });
}
