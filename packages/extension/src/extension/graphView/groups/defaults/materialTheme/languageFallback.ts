import languageFallbacks from './languageFallbacks.json';
import type { MaterialMatch } from './model';

const LANGUAGE_FALLBACKS = languageFallbacks as Array<{ extensions: string[]; languageId: string }>;

export function matchMaterialLanguageFallback(
  baseName: string,
  languageIds: Record<string, string>,
): MaterialMatch | undefined {
  let bestMatch: MaterialMatch | undefined;

  for (const { extensions, languageId } of LANGUAGE_FALLBACKS) {
    const iconName = languageIds[languageId];
    if (!iconName) {
      continue;
    }

    for (const extension of extensions) {
      const matches = baseName === extension || baseName.endsWith(`.${extension}`);
      if (!matches) {
        continue;
      }

      if (!bestMatch || extension.length > bestMatch.key.length) {
        bestMatch = {
          iconName,
          key: extension,
          kind: 'fileExtension',
        };
      }
    }
  }

  return bestMatch;
}
