import type { IGraphNode } from '../../../../../../shared/graph/contracts';
import { areGraphValuesEqual } from './values';

export function areNodesEqualIgnoringMetrics(left: IGraphNode, right: IGraphNode): boolean {
  if (left === right) {
    return true;
  }

  const leftRecord = left as unknown as Record<string, unknown>;
  const rightRecord = right as unknown as Record<string, unknown>;
  const keys = new Set([...Object.keys(leftRecord), ...Object.keys(rightRecord)]);
  keys.delete('churn');
  keys.delete('fileSize');

  for (const key of keys) {
    if (!areGraphValuesEqual(leftRecord[key], rightRecord[key])) {
      return false;
    }
  }

  return true;
}
