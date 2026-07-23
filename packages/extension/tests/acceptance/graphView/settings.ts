const CODEGRAPHY_EXTENSION_INTERFACE_ID = 'codegraphy.extension';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function extensionFavoritesFromSettings(settings: unknown): string[] {
  if (!isRecord(settings) || !Array.isArray(settings.interfaces)) {
    return [];
  }

  const extensionEntry = settings.interfaces.find((entry) => (
    isRecord(entry) && entry.id === CODEGRAPHY_EXTENSION_INTERFACE_ID
  ));
  if (!isRecord(extensionEntry) || !isRecord(extensionEntry.data)) {
    return [];
  }

  const favorites = extensionEntry.data.favorites;
  return Array.isArray(favorites)
    ? favorites.filter((favorite): favorite is string => typeof favorite === 'string')
    : [];
}
