import type { MaterialMatch } from './model';

export function findLongestExtensionMatch(
  baseName: string,
  entries: Iterable<readonly [string, string]>,
): MaterialMatch | undefined {
  const lowerBaseName = baseName.toLowerCase();
  let bestMatch: MaterialMatch | undefined;

  for (const [extension, iconName] of entries) {
    const match = createExtensionMatch(baseName, lowerBaseName, extension, iconName);
    if (!match || (bestMatch && bestMatch.key.length >= match.key.length)) {
      continue;
    }

    bestMatch = match;
  }

  return bestMatch;
}

function createExtensionMatch(
  baseName: string,
  lowerBaseName: string,
  extension: string,
  iconName: string,
): MaterialMatch | undefined {
  const lowerExtension = extension.toLowerCase();
  if (!matchesExtension(lowerBaseName, lowerExtension)) {
    return undefined;
  }

  return {
    iconName,
    key: lowerBaseName === lowerExtension ? baseName : baseName.slice(-extension.length),
    kind: 'fileExtension',
  };
}

function matchesExtension(lowerBaseName: string, lowerExtension: string): boolean {
  return lowerBaseName === lowerExtension || lowerBaseName.endsWith(`.${lowerExtension}`);
}
