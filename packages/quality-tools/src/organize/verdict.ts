import { type OrganizeComparison } from './types';

export function verdictFromDeltas(
  fileFanOutDelta: number,
  folderFanOutDelta: number,
  clusterCountDelta: number,
  issueCountDelta: number,
  redundancyDelta: number
): OrganizeComparison['verdict'] {
  const deltas = [fileFanOutDelta, folderFanOutDelta, clusterCountDelta, issueCountDelta, redundancyDelta];
  const allNegativeOrZero = deltas.every((delta) => delta <= 0);
  const allPositiveOrZero = deltas.every((delta) => delta >= 0);
  const hasNegative = deltas.some((delta) => delta < 0);
  const hasPositive = deltas.some((delta) => delta > 0);
  const allZero = deltas.every((delta) => delta === 0);

  if (allZero) {
    return 'unchanged';
  }
  if (allNegativeOrZero && hasNegative) {
    return 'improved';
  }
  if (allPositiveOrZero && hasPositive) {
    return 'worse';
  }
  return 'mixed';
}
