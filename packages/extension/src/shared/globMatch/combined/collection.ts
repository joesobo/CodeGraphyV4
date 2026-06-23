import type { CombinedFastGlobMatchers } from '../contracts';
import { collectFastMatcher } from '../fast/collection';
import { globToRegex } from '../regex';

export function collectCombinedFastMatchers(patterns: readonly string[]): {
  fastMatchers: CombinedFastGlobMatchers;
  regexPatterns: string[];
} {
  const fastMatchers: CombinedFastGlobMatchers = {
    directMatchers: [],
    literalSuffixes: [],
    recursiveDirectoryNames: new Set(),
    suffixes: [],
  };
  const regexPatterns: string[] = [];
  for (const pattern of patterns) {
    if (!collectFastMatcher(fastMatchers, pattern)) {
      regexPatterns.push(pattern);
    }
  }

  return { fastMatchers, regexPatterns };
}

export function createCombinedRegexMatcher(regexPatterns: readonly string[]): RegExp | null {
  return regexPatterns.length > 0
    ? new RegExp(regexPatterns.map(pattern => `(?:${globToRegex(pattern).source})`).join('|'))
    : null;
}
