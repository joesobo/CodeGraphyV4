import { type ScrapFileMetric } from '../analysis/metrics';
import { hotBlockLines } from './blocks/format';
import { comparisonLines } from './blocks/comparison';
import { verboseExampleLines, worstExampleLines } from './blocks/examples';
import { recommendationLines } from './blocks/recommendations';
import { summaryLines } from './summary';
import { validationLines } from './blocks/validation';

export interface ScrapReportOptions {
  verbose?: boolean;
}

function logLines(lines: string[]): void {
  for (const line of lines) {
    console.log(line);
  }
}

export function reportScrap(
  metrics: ScrapFileMetric[],
  repoRoot: string,
  options: ScrapReportOptions = {}
): void {
  if (metrics.length === 0) {
    console.log('\nNo test files found for SCRAP analysis.\n');
    return;
  }

  for (const metric of metrics) {
    logLines(summaryLines(metric, repoRoot));
    logLines(comparisonLines(metric));
    logLines(validationLines(metric));
    logLines(recommendationLines(metric));
    logLines(hotBlockLines(metric));
    logLines(worstExampleLines(metric));

    if (options.verbose) {
      logLines(verboseExampleLines(metric));
    }
  }
}
