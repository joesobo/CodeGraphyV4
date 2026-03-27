import { type ScrapFileMetric } from './metrics';

function formatBlockPath(path: string[]): string {
  return path.join(' > ');
}

function interestingBlocks(metric: ScrapFileMetric) {
  return metric.blockSummaries
    .filter((block) => block.remediationMode !== 'STABLE')
    .slice(0, 5);
}

export function hotBlockLines(metric: ScrapFileMetric): string[] {
  const hotBlocks = interestingBlocks(metric);
  if (hotBlocks.length === 0) {
    return [];
  }

  return [
    '  hot blocks:',
    ...hotBlocks.map(
      (block) =>
        `    - ${formatBlockPath(block.path)} mode=${block.remediationMode} examples=${block.exampleCount} avg/max=${block.averageScore} / ${block.maxScore} hot=${block.hotExampleCount} dupes=${block.duplicateSetupExampleCount} helpers=${block.helperHiddenExampleCount} extract=${block.recommendedExtractionCount ?? 0}`
    )
  ];
}
