import type { IAnalysisRelation } from '../../../../core/plugins/types/contracts';
import type { SymbolExportFileEntry } from '../build';

export function countByFilePath<T extends { filePath: string }>(items: readonly T[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const item of items) {
    counts.set(item.filePath, (counts.get(item.filePath) ?? 0) + 1);
  }

  return counts;
}

export function countRelationsByFilePath(
  items: readonly IAnalysisRelation[],
): Map<string, number> {
  const counts = new Map<string, number>();

  for (const item of items) {
    counts.set(item.fromFilePath, (counts.get(item.fromFilePath) ?? 0) + 1);
    if (item.toFilePath && item.toFilePath !== item.fromFilePath) {
      counts.set(item.toFilePath, (counts.get(item.toFilePath) ?? 0) + 1);
    }
  }

  return counts;
}

export function createFileEntries(
  filePaths: readonly string[],
  symbolCountsByFile: ReadonlyMap<string, number>,
  relationCountsByFile: ReadonlyMap<string, number>,
): SymbolExportFileEntry[] {
  return filePaths.map((filePath) => ({
    filePath,
    symbolCount: symbolCountsByFile.get(filePath) ?? 0,
    relationCount: relationCountsByFile.get(filePath) ?? 0,
  }));
}
