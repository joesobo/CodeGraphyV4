import { globToRegex } from './globRegex';

export { globToRegex } from './globRegex';

export function createGlobMatcher(pattern: string): (filePath: string) => boolean {
  const regex = globToRegex(pattern);
  return (filePath: string): boolean => regex.test(filePath);
}

export function globMatch(filePath: string, pattern: string): boolean {
  return createGlobMatcher(pattern)(filePath);
}
