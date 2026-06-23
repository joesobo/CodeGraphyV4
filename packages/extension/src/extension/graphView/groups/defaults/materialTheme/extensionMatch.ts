import type { MaterialMatch } from './model';

export interface MaterialExtensionMatcher {
  iconNameByLowerExtension: Map<string, string>;
}

export function createMaterialExtensionMatcher(
  extensions: Record<string, string>,
): MaterialExtensionMatcher {
  return {
    iconNameByLowerExtension: new Map(
      Object.entries(extensions).map(([extension, iconName]) => [
        extension.toLowerCase(),
        iconName,
      ]),
    ),
  };
}

export function findLongestExtensionMatch(
  baseName: string,
  entries: Iterable<readonly [string, string]>,
): MaterialMatch | undefined {
  return findLongestExtensionMatchWithMatcher(
    baseName,
    createMaterialExtensionMatcher(Object.fromEntries(entries)),
  );
}

export function findLongestExtensionMatchWithMatcher(
  baseName: string,
  matcher: MaterialExtensionMatcher,
): MaterialMatch | undefined {
  const lowerBaseName = baseName.toLowerCase();
  let bestMatch: MaterialMatch | undefined;

  for (const extension of getExtensionCandidates(lowerBaseName)) {
    const iconName = matcher.iconNameByLowerExtension.get(extension);
    if (!iconName) {
      continue;
    }

    const match = createExtensionMatch(baseName, lowerBaseName, extension, iconName);
    if (!match || (bestMatch && bestMatch.key.length >= match.key.length)) {
      continue;
    }

    bestMatch = match;
  }

  return bestMatch;
}

function getExtensionCandidates(lowerBaseName: string): string[] {
  const candidates = [lowerBaseName];
  for (let index = lowerBaseName.indexOf('.'); index >= 0; index = lowerBaseName.indexOf('.', index + 1)) {
    const extension = lowerBaseName.slice(index + 1);
    if (extension) {
      candidates.push(extension);
    }
  }

  return candidates;
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
