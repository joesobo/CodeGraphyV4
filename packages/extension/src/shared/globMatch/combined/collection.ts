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
    const expandedPatterns = expandSimpleCharacterClasses(pattern);
    if (expandedPatterns.every(expanded => collectFastMatcher(fastMatchers, expanded))) {
      continue;
    }
    regexPatterns.push(pattern);
  }

  return { fastMatchers, regexPatterns };
}

const MAX_CHARACTER_CLASS_EXPANSIONS = 8;

function expandSimpleCharacterClasses(pattern: string): string[] {
  const match = /\[([A-Za-z0-9]{1,3})\]/.exec(pattern);
  if (!match || match.index === undefined) return [pattern];

  const prefix = pattern.slice(0, match.index);
  const suffix = pattern.slice(match.index + match[0].length);
  const expansions = [...match[1]].flatMap(character =>
    expandSimpleCharacterClasses(`${prefix}${character}${suffix}`),
  );
  return expansions.length <= MAX_CHARACTER_CLASS_EXPANSIONS ? expansions : [pattern];
}

export function createCombinedRegexMatcher(regexPatterns: readonly string[]): RegExp | null {
  return regexPatterns.length > 0
    ? new RegExp(regexPatterns.map(pattern => `(?:${globToRegex(pattern).source})`).join('|'))
    : null;
}
