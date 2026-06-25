import { globToRegex } from './globRegex.js';

export { globToRegex } from './globRegex.js';

export function createGlobMatcher(pattern: string): (filePath: string) => boolean {
  const regex = globToRegex(pattern);
  return (filePath: string): boolean => regex.test(filePath);
}

export function globMatch(filePath: string, pattern: string): boolean {
  return createGlobMatcher(pattern)(filePath);
}
