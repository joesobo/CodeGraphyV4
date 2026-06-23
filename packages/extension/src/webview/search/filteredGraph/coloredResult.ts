import type { IGraphData } from '../../../shared/graph/contracts';
import type { IGroup } from '../../../shared/settings/groups';
import { applyLegendRules } from '../filtering/rules';
import { cacheReferenceResult, getReferenceResult } from './referenceCache';
import type { ReferenceResultCache } from './referenceCache';

export function getColoredGraphResult({
  cache,
  filteredData,
  key,
  legends,
}: {
  cache: ReferenceResultCache<IGraphData>;
  filteredData: IGraphData | null;
  key: string;
  legends: IGroup[];
}): IGraphData | null {
  if (!filteredData) {
    return null;
  }

  const cached = getReferenceResult(cache, filteredData, key);
  if (cached) {
    return cached;
  }

  const result = applyLegendRules(filteredData, legends);
  if (result) {
    cacheReferenceResult(cache, filteredData, key, result);
  }
  return result;
}
