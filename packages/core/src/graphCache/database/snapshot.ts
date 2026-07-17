import * as fs from 'node:fs';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '@codegraphy-dev/plugin-api';
import { readRowsSync, withConnection } from './io/connection';
import { getWorkspaceAnalysisDatabasePath } from './io/paths';
import { createSnapshotFileEntry } from './records/file';
import { createSnapshotRelationEntry } from './relation/entry';
import { createSnapshotSymbolEntry } from './records/symbol';
import type { RelationRow, SymbolRow } from './records/contracts';
import {
  FILE_ROWS_QUERY,
  RELATION_ROWS_QUERY,
  SYMBOL_ROWS_QUERY,
} from './query/read';

export interface WorkspaceAnalysisDatabaseSnapshot {
  files: Array<{
    filePath: string;
    mtime: number;
    contentHash?: string;
    size?: number;
    analysis: IFileAnalysisResult;
  }>;
  symbols: IAnalysisSymbol[];
  relations: IAnalysisRelation[];
}

export function readWorkspaceAnalysisDatabaseSnapshot(
  workspaceRoot: string,
): WorkspaceAnalysisDatabaseSnapshot {
  const databasePath = getWorkspaceAnalysisDatabasePath(workspaceRoot);
  if (!fs.existsSync(databasePath)) {
    return { files: [], symbols: [], relations: [] };
  }

  try {
    return withConnection(databasePath, (connection) => {
      const fileRows = readRowsSync(connection, FILE_ROWS_QUERY);
      const symbolRows = readRowsSync(connection, SYMBOL_ROWS_QUERY) as SymbolRow[];
      const relationRows = readRowsSync(connection, RELATION_ROWS_QUERY) as RelationRow[];
      const files = fileRows.flatMap((row) => {
        const entry = createSnapshotFileEntry(row);
        return entry ? [entry] : [];
      });
      const analysisPathByFilePath = new Map(files.map(file => [
        file.filePath,
        file.analysis.filePath ?? file.filePath,
      ]));
      const symbolRecords = symbolRows.flatMap((row) => {
        const entry = createSnapshotSymbolEntry(row);
        const ownerFilePath = typeof row.filePath === 'string' ? row.filePath : entry?.filePath;
        const filePath = ownerFilePath ? analysisPathByFilePath.get(ownerFilePath) : undefined;
        return entry && ownerFilePath
          ? [{ ownerFilePath, value: { ...entry, filePath: filePath ?? entry.filePath } }]
          : [];
      });
      const relationRecords = relationRows.flatMap((row) => {
        const entry = createSnapshotRelationEntry(row);
        const ownerFilePath = typeof row.filePath === 'string' ? row.filePath : entry?.fromFilePath;
        return entry && ownerFilePath
          ? [{ ownerFilePath, value: entry }]
          : [];
      });
      const symbolsByFilePath = new Map<string, IAnalysisSymbol[]>();
      for (const record of symbolRecords) {
        const entries = symbolsByFilePath.get(record.ownerFilePath) ?? [];
        entries.push(record.value);
        symbolsByFilePath.set(record.ownerFilePath, entries);
      }
      const relationsByFilePath = new Map<string, IAnalysisRelation[]>();
      for (const record of relationRecords) {
        const entries = relationsByFilePath.get(record.ownerFilePath) ?? [];
        entries.push(record.value);
        relationsByFilePath.set(record.ownerFilePath, entries);
      }
      const hydratedFiles = files.map(file => ({
        ...file,
        analysis: {
          ...file.analysis,
          ...((symbolsByFilePath.get(file.filePath)?.length ?? 0) > 0
            ? { symbols: symbolsByFilePath.get(file.filePath) }
            : {}),
          ...((relationsByFilePath.get(file.filePath)?.length ?? 0) > 0
            ? { relations: relationsByFilePath.get(file.filePath) }
            : {}),
        },
      }));

      return {
        files: hydratedFiles,
        symbols: symbolRecords.map(record => record.value),
        relations: relationRecords.map(record => record.value),
      };
    });
  } catch (error) {
    console.warn('[CodeGraphy] Failed to read structured analysis snapshot.', error);
    return { files: [], symbols: [], relations: [] };
  }
}
