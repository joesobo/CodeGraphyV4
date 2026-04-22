import languageFallbacks from './languageFallbacks.json';
import { findLongestExtensionMatch } from './extensionMatch';
import type { MaterialMatch } from './model';

const LANGUAGE_FALLBACKS = languageFallbacks as Array<{ extensions: string[]; languageId: string }>;

export function matchMaterialLanguageFallback(
  baseName: string,
  languageIds: Record<string, string>,
): MaterialMatch | undefined {
  return findLongestExtensionMatch(baseName, getLanguageFallbackEntries(languageIds));
}

function getLanguageFallbackEntries(
  languageIds: Record<string, string>,
): Array<readonly [string, string]> {
  const entries: Array<readonly [string, string]> = [];

  for (const { extensions, languageId } of LANGUAGE_FALLBACKS) {
    const iconName = languageIds[languageId];
    if (!iconName) {
      continue;
    }

    for (const extension of extensions) {
      entries.push([extension, iconName]);
    }
  }

  return entries;
}
