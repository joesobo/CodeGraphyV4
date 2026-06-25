import type { GlobMatcher } from '../contracts';

export function createRecursiveDirectoryMatcher(directoryPath: string): GlobMatcher {
  const rootPrefix = `${directoryPath}/`;
  const nestedPrefix = `/${rootPrefix}`;

  return (filePath: string): boolean => (
    filePath.startsWith(rootPrefix) || filePath.includes(nestedPrefix)
  );
}

export function createDirectChildMatcher(directoryPath: string): GlobMatcher {
  const rootPrefix = `${directoryPath}/`;
  const nestedPrefix = `/${rootPrefix}`;

  return (filePath: string): boolean => {
    let start = 0;
    if (!filePath.startsWith(rootPrefix)) {
      const nestedStart = filePath.lastIndexOf(nestedPrefix);
      if (nestedStart < 0) {
        return false;
      }
      start = nestedStart + 1;
    }

    const remainder = filePath.slice(start + rootPrefix.length);
    return remainder.length > 0 && !remainder.includes('/');
  };
}
