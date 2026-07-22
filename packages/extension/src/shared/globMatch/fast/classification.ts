import type { FastGlobPattern } from '../contracts';
import {
  getDirectoryPattern,
  getExtensionSuffixPattern,
  removeRecursivePrefix,
} from './patternParts';

export function classifyFastGlobPattern(pattern: string): FastGlobPattern | undefined {
  if (pattern.includes('[')) {
    return undefined;
  }

  const recursivePattern = removeRecursivePrefix(pattern);

  if (!recursivePattern.includes('*')) {
    return { kind: 'literal', suffix: recursivePattern };
  }

  const suffix = getExtensionSuffixPattern(recursivePattern);
  if (suffix) {
    return { kind: 'suffix', suffix };
  }

  const recursiveDirectoryPath = getDirectoryPattern(recursivePattern, '/**');
  if (recursiveDirectoryPath) {
    return { kind: 'recursiveDirectory', directoryPath: recursiveDirectoryPath };
  }

  const directChildDirectoryPath = getDirectoryPattern(recursivePattern, '/*');
  return directChildDirectoryPath
    ? { kind: 'directChild', directoryPath: directChildDirectoryPath }
    : undefined;
}
