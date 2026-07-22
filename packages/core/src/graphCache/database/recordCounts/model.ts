import * as fs from 'node:fs';
import {
  readRowsSync,
  withReadOnlyConnection,
  type SQLiteConnection,
} from '../io/connection';
import { getWorkspaceAnalysisDatabasePath } from '../io/paths';

export interface WorkspaceAnalysisDatabaseRecordCounts {
  indexedFiles: number;
  nodes: number;
  symbols: number;
  edges: number;
}

export const EMPTY_WORKSPACE_ANALYSIS_DATABASE_RECORD_COUNTS: WorkspaceAnalysisDatabaseRecordCounts = {
  indexedFiles: 0,
  nodes: 0,
  symbols: 0,
  edges: 0,
};

export function readWorkspaceAnalysisDatabaseRecordCounts(
  workspaceRoot: string,
): WorkspaceAnalysisDatabaseRecordCounts {
  const databasePath = getWorkspaceAnalysisDatabasePath(workspaceRoot);
  if (!fs.existsSync(databasePath)) return EMPTY_WORKSPACE_ANALYSIS_DATABASE_RECORD_COUNTS;
  try {
    return withReadOnlyConnection(
      databasePath,
      readWorkspaceAnalysisDatabaseRecordCountsFromConnection,
    );
  } catch {
    return EMPTY_WORKSPACE_ANALYSIS_DATABASE_RECORD_COUNTS;
  }
}

export function readWorkspaceAnalysisDatabaseRecordCountsFromConnection(
  connection: SQLiteConnection,
): WorkspaceAnalysisDatabaseRecordCounts {
  const rows = readRowsSync(connection, `SELECT
    (SELECT count(*) FROM File) AS indexedFiles,
    (SELECT count(*) FROM Node) AS nodes,
    (SELECT count(*) FROM Symbol) AS symbols,
    (SELECT count(*) FROM Edge) AS edges`);
  const row = rows[0] as Partial<WorkspaceAnalysisDatabaseRecordCounts> | undefined;
  return {
    indexedFiles: Number(row?.indexedFiles ?? 0),
    nodes: Number(row?.nodes ?? 0),
    symbols: Number(row?.symbols ?? 0),
    edges: Number(row?.edges ?? 0),
  };
}
