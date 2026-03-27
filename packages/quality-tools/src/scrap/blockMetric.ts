import { remediationMode } from './remediationMode';
import { duplicateSetupExampleCount } from './setupDuplicates';
import { type ScrapBlockSummary, type ScrapExampleMetric } from './scrapTypes';

function averageScore(examples: ScrapExampleMetric[]): number {
  const total = examples.reduce((sum, example) => sum + example.score, 0);
  return total / examples.length;
}

function countExamples(
  examples: ScrapExampleMetric[],
  predicate: (example: ScrapExampleMetric) => boolean
): number {
  return examples.filter(predicate).length;
}

export function summarizeBlock(path: string[], examples: ScrapExampleMetric[]): ScrapBlockSummary {
  const meanScore = averageScore(examples);
  const maxScore = examples.reduce((max, example) => Math.max(max, example.score), 0);
  const hotExampleCount = countExamples(examples, (example) => example.score >= 8);

  return {
    averageScore: Math.round(meanScore * 100) / 100,
    branchingExampleCount: countExamples(examples, (example) => example.branchCount > 0),
    duplicateSetupExampleCount: duplicateSetupExampleCount(
      examples.map((example) => example.duplicateSetupGroupSize)
    ),
    exampleCount: examples.length,
    helperHiddenExampleCount: countExamples(examples, (example) => example.helperHiddenLineCount > 0),
    hotExampleCount,
    lowAssertionExampleCount: countExamples(examples, (example) => example.assertionCount <= 1),
    maxScore,
    name: path[path.length - 1],
    path,
    remediationMode: remediationMode(examples.length, meanScore, hotExampleCount, maxScore),
    zeroAssertionExampleCount: countExamples(examples, (example) => example.assertionCount === 0)
  };
}
