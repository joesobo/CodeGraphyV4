import type { MaterialMatch } from './model';
import {
  createExtensionMatch,
  getExtensionCandidates,
} from './extensionMatch/candidates';

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
