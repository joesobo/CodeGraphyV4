import { classifyFastGlobPattern } from './classification';
import type { GlobMatcher } from '../contracts';
import {
  createDirectChildMatcher,
  createRecursiveDirectoryMatcher,
} from './directoryMatchers';
import { matchesPathSuffix } from './pathSuffix';
import { createSuffixMatcher } from './suffixMatcher';

export function createFastGlobMatcher(pattern: string): GlobMatcher | undefined {
  if (!pattern) {
    return () => false;
  }

  const fastPattern = classifyFastGlobPattern(pattern);
  if (!fastPattern) {
    return undefined;
  }

  if (fastPattern.kind === 'literal') {
    return (filePath: string): boolean => matchesPathSuffix(filePath, fastPattern.suffix);
  }

  if (fastPattern.kind === 'suffix') {
    return createSuffixMatcher(fastPattern.suffix);
  }

  return fastPattern.kind === 'directChild'
    ? createDirectChildMatcher(fastPattern.directoryPath)
    : createRecursiveDirectoryMatcher(fastPattern.directoryPath);
}
