import type { MaterialMatch } from './model';
import { findLongestPathMatch } from './pathMatch';

export function matchMaterialFileName(
  nodeId: string,
  fileNames: Record<string, string>,
): MaterialMatch | undefined {
  return findLongestPathMatch(nodeId, fileNames, 'fileName');
}
