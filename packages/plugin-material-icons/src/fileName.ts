import type { MaterialMatch } from './model';
import {
  createMaterialPathRuleMatcher,
  findLongestPathMatchWithMatcher,
  type MaterialPathRuleMatcher,
} from './pathMatch';

export function matchMaterialFileName(
  nodeId: string,
  fileNames: Record<string, string>,
  matcher: MaterialPathRuleMatcher = createMaterialPathRuleMatcher(fileNames),
): MaterialMatch | undefined {
  return findLongestPathMatchWithMatcher(nodeId, matcher, 'fileName');
}
