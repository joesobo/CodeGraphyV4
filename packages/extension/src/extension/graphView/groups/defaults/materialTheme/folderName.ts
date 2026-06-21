import type { MaterialMatch } from './model';
import {
  createMaterialPathRuleMatcher,
  findLongestPathMatchWithMatcher,
  type MaterialPathRuleMatcher,
} from './pathMatch';

export function matchMaterialFolderName(
  folderPath: string,
  folderNames: Record<string, string>,
  folderNamesExpanded: Record<string, string> = {},
  matchers: {
    folderNames?: MaterialPathRuleMatcher;
    folderNamesExpanded?: MaterialPathRuleMatcher;
  } = {},
): MaterialMatch | undefined {
  return findLongestPathMatchWithMatcher(
    folderPath,
    matchers.folderNames ?? createMaterialPathRuleMatcher(folderNames),
    'folderName',
  )
    ?? findLongestPathMatchWithMatcher(
      folderPath,
      matchers.folderNamesExpanded ?? createMaterialPathRuleMatcher(folderNamesExpanded),
      'folderName',
    );
}
