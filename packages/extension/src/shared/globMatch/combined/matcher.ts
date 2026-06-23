import type {
  CombinedFastGlobMatchers,
  GlobMatcher,
} from '../contracts';
import {
  collectCombinedFastMatchers,
  createCombinedRegexMatcher,
} from './collection';
import {
  containsRecursiveDirectoryName,
  hasAnySuffix,
  matchesAnyPathSuffix,
} from './predicates';
import { createFastGlobMatcher } from '../fast/matcher';
import { createGlobMatcher } from '../matcher';

function createCombinedFastMatcher(
  fastMatchers: CombinedFastGlobMatchers,
  regex: RegExp | null,
): GlobMatcher {
  return (filePath: string): boolean => {
    if (
      containsRecursiveDirectoryName(filePath, fastMatchers.recursiveDirectoryNames)
      || hasAnySuffix(filePath, fastMatchers.suffixes)
      || matchesAnyPathSuffix(filePath, fastMatchers.literalSuffixes)
    ) {
      return true;
    }

    for (const matcher of fastMatchers.directMatchers) {
      if (matcher(filePath)) {
        return true;
      }
    }

    return regex ? regex.test(filePath) : false;
  };
}

export function createCombinedGlobMatcher(patterns: readonly string[]): GlobMatcher {
  if (patterns.length === 0) {
    return () => false;
  }

  if (patterns.length === 1) {
    const pattern = patterns[0] ?? '';
    return createFastGlobMatcher(pattern) ?? createGlobMatcher(pattern);
  }

  const { fastMatchers, regexPatterns } = collectCombinedFastMatchers(patterns);
  const regex = regexPatterns.length > 0
    ? createCombinedRegexMatcher(regexPatterns)
    : null;
  return createCombinedFastMatcher(fastMatchers, regex);
}
