import { createCombinedGlobMatcher as createCombinedGlobMatcherImpl } from './globMatch/combined/matcher';
import { createGlobMatcher as createGlobMatcherImpl, globMatch as globMatchImpl } from './globMatch/matcher';
import { globToRegex as globToRegexImpl } from './globMatch/regex';

export function globToRegex(pattern: string): RegExp {
  return globToRegexImpl(pattern);
}

export function createGlobMatcher(pattern: string): (filePath: string) => boolean {
  return createGlobMatcherImpl(pattern);
}

export function createCombinedGlobMatcher(patterns: readonly string[]): (filePath: string) => boolean {
  return createCombinedGlobMatcherImpl(patterns);
}

export function globMatch(filePath: string, pattern: string): boolean {
  return globMatchImpl(filePath, pattern);
}
