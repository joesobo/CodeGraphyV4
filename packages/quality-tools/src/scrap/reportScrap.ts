import { type ScrapFileMetric } from './metrics';
import { hotBlockLines } from './reportBlocks';
import { comparisonLines } from './reportComparison';
import { verboseExampleLines, worstExampleLines } from './reportExamples';
import { recommendationLines } from './reportRecommendations';
import { summaryLines } from './reportSummary';
import { validationLines } from './reportValidation';

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
