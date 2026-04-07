import { basename } from 'path';
import { tokenize } from '../tokenize';
import { isConventionalEntryFile } from './pathRedundancyConventional';

/**
 * Calculate the redundancy score of a file based on its path.
 *
 * @param filePath - The full path to the file (e.g., "scrap/types.ts")
 * @param ancestorFolders - Array of ancestor folder names (e.g., ["scrap"])
 * @returns A ratio from 0 to 1 indicating how many filename tokens appear in ancestor folders.
 *
 * Example: scrap/types.ts
 * - filename tokens: ['scrap', 'types']
 * - ancestor tokens: {'scrap'}
 * - shared: 1 out of 2 = 0.5
 */
export function pathRedundancy(filePath: string, ancestorFolders: string[]): number {
  if (isConventionalEntryFile(filePath, ancestorFolders)) {
    return 0;
  }

  // Get just the filename from the path
  const fileName = basename(filePath);

  // Tokenize the filename
  const fileTokens = tokenize(fileName);

  // If the filename has no tokens, return 0
  if (fileTokens.length === 0) {
    return 0;
  }

  // Collect all ancestor tokens into a set for efficient lookup
  const ancestorTokens = new Set<string>();
  for (const folder of ancestorFolders) {
    const folderTokens = tokenize(folder);
    for (const token of folderTokens) {
      ancestorTokens.add(token);
    }
  }

  // Count how many filename tokens appear in the ancestor set
  const sharedCount = fileTokens.filter((token) => ancestorTokens.has(token)).length;

  // Return the ratio of shared tokens to total filename tokens
  return sharedCount / fileTokens.length;
}
