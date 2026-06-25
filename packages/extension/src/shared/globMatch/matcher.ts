import type { GlobMatcher } from './contracts';
import { createFastGlobMatcher } from './fast/matcher';
import { globToRegex } from './regex';

export function createGlobMatcher(pattern: string): GlobMatcher {
  const fastMatcher = createFastGlobMatcher(pattern);
  if (fastMatcher) {
    return fastMatcher;
  }

  const regex = globToRegex(pattern);
  return (filePath: string): boolean => regex.test(filePath);
}

export function globMatch(filePath: string, pattern: string): boolean {
  return createGlobMatcher(pattern)(filePath);
}
