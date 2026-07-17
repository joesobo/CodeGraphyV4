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
  FILE_ANALYSIS_ROWS_QUERY,
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

function readSymbolsFromFileAnalysis(files: WorkspaceAnalysisDatabaseSnapshot['files']): IAnalysisSymbol[] {
  return files.flatMap(file => file.analysis.symbols ?? []);
}

function readRelationsFromFileAnalysis(files: WorkspaceAnalysisDatabaseSnapshot['files']): IAnalysisRelation[] {
  return files.flatMap(file => file.analysis.relations ?? []);
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
      const files = fileRows.flatMap((row) => {
        const entry = createSnapshotFileEntry(row);
        return entry ? [entry] : [];
      });
      const symbols = symbolRows.flatMap((row) => {
        const entry = createSnapshotSymbolEntry(row);
        return entry ? [entry] : [];
      });
      const relations = relationRows.flatMap((row) => {
        const entry = createSnapshotRelationEntry(row);
        return entry ? [entry] : [];
      });

      return {
        files,
        symbols: symbols.length > 0 ? symbols : readSymbolsFromFileAnalysis(files),
        relations: relations.length > 0 ? relations : readRelationsFromFileAnalysis(files),
      };
    });
  } catch (error) {
    console.warn('[CodeGraphy] Failed to read structured analysis snapshot.', error);
    return { files: [], symbols: [], relations: [] };
  }
}
