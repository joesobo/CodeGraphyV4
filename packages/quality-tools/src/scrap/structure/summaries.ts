import { compareBlockSummaries } from './ordering';
import { blockPathFromKey, prefixBlockGroups } from './groups';
import { summarizeBlock } from './metric';
import { type ScrapBlockSummary, type ScrapExampleMetric } from '../types';

export function summarizeBlocks(examples: ScrapExampleMetric[]): ScrapBlockSummary[] {
  return [...prefixBlockGroups(examples).entries()]
    .map(([key, group]) => summarizeBlock(blockPathFromKey(key), group))
    .sort(compareBlockSummaries);
}
