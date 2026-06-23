import { matchesPathSuffix } from '../fast/pathSuffix';

export function matchesAnyPathSuffix(filePath: string, suffixes: readonly string[]): boolean {
  for (const suffix of suffixes) {
    if (matchesPathSuffix(filePath, suffix)) {
      return true;
    }
  }

  return false;
}

export function hasAnySuffix(filePath: string, suffixes: readonly string[]): boolean {
  for (const suffix of suffixes) {
    if (filePath.endsWith(suffix)) {
      return true;
    }
  }

  return false;
}

export function containsRecursiveDirectoryName(
  filePath: string,
  directoryNames: ReadonlySet<string>,
): boolean {
  if (directoryNames.size === 0) {
    return false;
  }

  let segmentStart = 0;
  while (segmentStart < filePath.length) {
    const slashIndex = filePath.indexOf('/', segmentStart);
    if (slashIndex < 0) {
      return false;
    }

    if (directoryNames.has(filePath.slice(segmentStart, slashIndex))) {
      return true;
    }

    segmentStart = slashIndex + 1;
  }

  return false;
}
