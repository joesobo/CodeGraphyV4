import type { GlobMatcher } from '../contracts';

export function createSuffixMatcher(suffix: string): GlobMatcher {
  const suffixLength = suffix.length;
  const suffixFirstCode = suffix.charCodeAt(0);
  return (filePath: string): boolean => (
    filePath.length >= suffixLength
    && filePath.charCodeAt(filePath.length - suffixLength) === suffixFirstCode
    && filePath.endsWith(suffix)
  );
}
