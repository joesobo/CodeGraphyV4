export function removeRecursivePrefix(pattern: string): string {
  return pattern.startsWith('**/') ? pattern.slice(3) : pattern;
}

export function getExtensionSuffixPattern(pattern: string): string | undefined {
  const hasOnlyLeadingWildcard = pattern.startsWith('*.') && pattern.indexOf('*', 1) === -1;
  return hasOnlyLeadingWildcard && !pattern.includes('/') ? pattern.slice(1) : undefined;
}

export function getDirectoryPattern(pattern: string, ending: '/**' | '/*'): string | undefined {
  if (!pattern.endsWith(ending)) {
    return undefined;
  }

  const directoryPath = pattern.slice(0, -ending.length);
  return directoryPath && !directoryPath.includes('*') ? directoryPath : undefined;
}
