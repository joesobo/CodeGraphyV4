import { compareBlockSummaries } from './blockOrdering';
import { blockPathFromKey, prefixBlockGroups } from './blockGroups';
import { summarizeBlock } from './blockMetric';
import { type ScrapBlockSummary, type ScrapExampleMetric } from './scrapTypes';

export function summarizeBlocks(examples: ScrapExampleMetric[]): ScrapBlockSummary[] {
  return [...prefixBlockGroups(examples).entries()]
    .map(([key, group]) => summarizeBlock(blockPathFromKey(key), group))
    .sort(compareBlockSummaries);
}
