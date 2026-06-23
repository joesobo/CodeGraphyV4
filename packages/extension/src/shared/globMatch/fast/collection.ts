import { classifyFastGlobPattern } from './classification';
import type {
  CombinedFastGlobMatchers,
  FastGlobPattern,
} from '../contracts';
import {
  createDirectChildMatcher,
  createRecursiveDirectoryMatcher,
} from './directoryMatchers';

function addFastMatcher(fastMatchers: CombinedFastGlobMatchers, pattern: FastGlobPattern): void {
  if (pattern.kind === 'literal') {
    fastMatchers.literalSuffixes.push(pattern.suffix);
    return;
  }

  if (pattern.kind === 'suffix') {
    fastMatchers.suffixes.push(pattern.suffix);
    return;
  }

  if (pattern.kind === 'directChild') {
    fastMatchers.directMatchers.push(createDirectChildMatcher(pattern.directoryPath));
    return;
  }

  if (!pattern.directoryPath.includes('/')) {
    fastMatchers.recursiveDirectoryNames.add(pattern.directoryPath);
    return;
  }

  fastMatchers.directMatchers.push(createRecursiveDirectoryMatcher(pattern.directoryPath));
}

export function collectFastMatcher(
  fastMatchers: CombinedFastGlobMatchers,
  pattern: string,
): boolean {
  const fastPattern = classifyFastGlobPattern(pattern);
  if (!fastPattern) {
    return false;
  }

  addFastMatcher(fastMatchers, fastPattern);
  return true;
}
