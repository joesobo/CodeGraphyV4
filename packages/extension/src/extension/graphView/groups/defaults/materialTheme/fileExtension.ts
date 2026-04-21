import type { MaterialMatch } from './model';

export function matchMaterialFileExtension(
  baseName: string,
  fileExtensions: Record<string, string>,
): MaterialMatch | undefined {
  let bestMatch: MaterialMatch | undefined;

  for (const [extension, iconName] of Object.entries(fileExtensions)) {
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

  return bestMatch;
}
