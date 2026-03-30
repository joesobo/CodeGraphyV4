import * as ts from 'typescript';
import { analyzeExample } from '../example/metrics';
import { analyzeExampleSetup } from '../example/setup';
import { findExamples } from './find';
import { scoreExample } from './score';
import { duplicateSetupGroupSizes } from '../example/calls/duplicates';
import { type ScrapExampleMetric } from '../types';

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
