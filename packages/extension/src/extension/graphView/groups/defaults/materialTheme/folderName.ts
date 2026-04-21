import type { MaterialMatch } from './model';
import { findLongestPathMatch } from './pathMatch';

export function matchMaterialFolderName(
  folderPath: string,
  folderNames: Record<string, string>,
  folderNamesExpanded: Record<string, string> = {},
): MaterialMatch | undefined {
  return findLongestPathMatch(folderPath, folderNames, 'folderName')
    ?? findLongestPathMatch(folderPath, folderNamesExpanded, 'folderName');
}
