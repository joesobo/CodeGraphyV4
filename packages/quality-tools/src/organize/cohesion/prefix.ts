import { tokenize } from '../tokenize';

/**
 * Group files by their first token (prefix).
 */
export function buildPrefixGroups(fileNames: string[]): Map<string, Set<string>> {
  const groups = new Map<string, Set<string>>();

  for (const fileName of fileNames) {
    const tokens = tokenize(fileName);
    if (tokens.length > 0) {
      const prefix = tokens[0];
      if (!groups.has(prefix)) {
        groups.set(prefix, new Set());
      }
      groups.get(prefix)!.add(fileName);
    }
  }

  return groups;
}

/**
 * Count the frequency of first tokens across filenames.
 */
export function countFirstTokens(fileNames: string[]): Map<string, number> {
  const tokenCounts = new Map<string, number>();
  for (const fileName of fileNames) {
    const tokens = tokenize(fileName);
    if (tokens.length > 0) {
      const token = tokens[0];
      tokenCounts.set(token, (tokenCounts.get(token) ?? 0) + 1);
    }
  }
  return tokenCounts;
}

/**
 * Find the token with the highest count.
 */
export function findMostCommonToken(tokenCounts: Map<string, number>): string {
  let mostCommonToken = '';
  let maxCount = 0;
  for (const [token, count] of tokenCounts) {
    if (count > maxCount) {
      maxCount = count;
      mostCommonToken = token;
    }
  }
  return mostCommonToken;
}

/**
 * Derive a prefix from a list of filenames.
 * Tries to find the most common first token, or uses the first file's first token.
 */
export function derivePrefix(fileNames: string[]): string {
  if (fileNames.length === 0) {
    return '';
  }

  const tokenCounts = countFirstTokens(fileNames);
  const mostCommonToken = findMostCommonToken(tokenCounts);

  if (mostCommonToken) {
    return mostCommonToken;
  }

  // Fallback: use the first file's first token
  const tokens = tokenize(fileNames[0]);
  return tokens.length > 0 ? tokens[0] : fileNames[0];
}
