import * as fs from 'node:fs';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '../../../../core/plugins/types/contracts';
import { readRowsSync, withConnection } from './connection';
import { getWorkspaceAnalysisDatabasePath } from './paths';
import {
  createSnapshotFileEntry,
  createSnapshotRelationEntry,
  createSnapshotSymbolEntry,
  type RelationRow,
  type SymbolRow,
} from './rows';
import {
  FILE_ANALYSIS_ROWS_QUERY,
  RELATION_ROWS_QUERY,
  SYMBOL_ROWS_QUERY,
} from './queries';

export interface WorkspaceAnalysisDatabaseSnapshot {
  files: Array<{
    filePath: string;
    mtime: number;
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
      const fileRows = readRowsSync(connection, FILE_ANALYSIS_ROWS_QUERY);
      const symbolRows = readRowsSync(connection, SYMBOL_ROWS_QUERY) as SymbolRow[];
      const relationRows = readRowsSync(connection, RELATION_ROWS_QUERY) as RelationRow[];

      return {
        files: fileRows.flatMap((row) => {
          const entry = createSnapshotFileEntry(row);
          return entry ? [entry] : [];
        }),
        symbols: symbolRows.flatMap((row) => {
          const entry = createSnapshotSymbolEntry(row);
          return entry ? [entry] : [];
        }),
        relations: relationRows.flatMap((row) => {
          const entry = createSnapshotRelationEntry(row);
          return entry ? [entry] : [];
        }),
      };
    });
  } catch (error) {
    console.warn('[CodeGraphy] Failed to read structured analysis snapshot.', error);
    return { files: [], symbols: [], relations: [] };
  }
}
