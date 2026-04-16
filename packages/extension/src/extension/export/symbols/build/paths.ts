export function sortByFilePath<T extends { filePath: string }>(items: readonly T[]): T[] {
  return [...items].sort((left, right) => left.filePath.localeCompare(right.filePath));
}

function normalizePathSlashes(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

export function createExportFilePathResolver(filePaths: readonly string[]): (filePath: string) => string {
  const normalizedByExportPath = new Map<string, string>();

  for (const filePath of filePaths) {
    normalizedByExportPath.set(normalizePathSlashes(filePath), filePath);
  }

  return (filePath: string): string => {
    const normalized = normalizePathSlashes(filePath);
    const exactMatch = normalizedByExportPath.get(normalized);

    if (exactMatch) {
      return exactMatch;
    }

    for (const [candidate, exportPath] of normalizedByExportPath.entries()) {
      if (normalized.endsWith(`/${candidate}`)) {
        return exportPath;
      }
    }

    return normalized;
  };
}
