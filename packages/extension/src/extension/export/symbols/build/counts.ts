import type { IAnalysisRelationshipEvidence } from '../../../../core/plugins/types/contracts';
import type { SymbolExportFileEntry } from '../build';
import { materializeRelationshipTargetPath } from '@codegraphy-dev/core';

export function countByFilePath<T extends { filePath: string }>(items: readonly T[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const item of items) {
    counts.set(item.filePath, (counts.get(item.filePath) ?? 0) + 1);
  }

  return counts;
}

export function countRelationsByFilePath(
  items: readonly IAnalysisRelationshipEvidence[],
): Map<string, number> {
  const counts = new Map<string, number>();

  for (const item of items) {
    const sourceFilePath = item.from?.kind === 'symbol' ? item.from.filePath : item.from?.kind === 'file' ? item.from.filePath : undefined;
    const targetFilePath = item.target.kind === 'symbol'
      ? item.target.filePath
      : materializeRelationshipTargetPath(item.target, '');

    if (sourceFilePath) {
      counts.set(sourceFilePath, (counts.get(sourceFilePath) ?? 0) + 1);
    }
    if (targetFilePath && targetFilePath !== sourceFilePath) {
      counts.set(targetFilePath, (counts.get(targetFilePath) ?? 0) + 1);
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
