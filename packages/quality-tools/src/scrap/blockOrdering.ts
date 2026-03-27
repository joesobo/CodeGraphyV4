import { type ScrapBlockSummary } from './scrapTypes';

function pathLabel(summary: ScrapBlockSummary): string {
  return summary.path.join(' > ');
}

export function compareBlockSummaries(left: ScrapBlockSummary, right: ScrapBlockSummary): number {
  return (
    right.maxScore - left.maxScore ||
    right.averageScore - left.averageScore ||
    right.exampleCount - left.exampleCount ||
    pathLabel(left).localeCompare(pathLabel(right))
  );
}
