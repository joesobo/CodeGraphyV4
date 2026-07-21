import * as fs from 'node:fs';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
  IGraphData,
} from '@codegraphy-dev/plugin-api';
import {
  readRowsSync,
  withReadOnlyConnection,
  type SQLiteConnection,
} from './io/connection';
import { getWorkspaceAnalysisDatabasePath } from './io/paths';
import {
  GRAPH_CACHE_SCHEMA_VERSION,
  hasCurrentGraphCacheSchema,
} from './io/schema';
import { parseDatabaseRecords } from './records/parser';
import type { FileRow, GraphEdgeRow, GraphNodeRow, SymbolRow } from './records/types';
import { EDGE_ROWS_QUERY, FILE_ROWS_QUERY, NODE_ROWS_QUERY, SYMBOL_ROWS_QUERY } from './query/read';

export interface WorkspaceAnalysisDatabaseSnapshot {
  files: Array<{
    filePath: string;
    mtime: number;
    contentHash?: string;
    size?: number;
    analysis: IFileAnalysisResult;
  }>;
  graph: IGraphData;
  symbols: IAnalysisSymbol[];
  relations: IAnalysisRelation[];
}

export interface WorkspaceAnalysisDatabaseRecordCounts {
  indexedFiles: number;
  nodes: number;
  symbols: number;
  edges: number;
}

export interface WorkspaceAnalysisDatabaseInspection {
  ok: boolean;
  schemaVersion: number | null;
  expectedSchemaVersion: number;
  schemaCompatible: boolean;
  records: WorkspaceAnalysisDatabaseRecordCounts;
  message?: string;
}

const EMPTY_COUNTS: WorkspaceAnalysisDatabaseRecordCounts = {
  indexedFiles: 0,
  nodes: 0,
  symbols: 0,
  edges: 0,
};

const EMPTY_SNAPSHOT: WorkspaceAnalysisDatabaseSnapshot = {
  files: [],
  graph: { nodes: [], edges: [] },
  symbols: [],
  relations: [],
};

export function readWorkspaceAnalysisDatabaseRecordCounts(
  workspaceRoot: string,
): WorkspaceAnalysisDatabaseRecordCounts {
  const databasePath = getWorkspaceAnalysisDatabasePath(workspaceRoot);
  if (!fs.existsSync(databasePath)) return EMPTY_COUNTS;
  try {
    return withReadOnlyConnection(
      databasePath,
      readWorkspaceAnalysisDatabaseRecordCountsFromConnection,
    );
  } catch {
    return EMPTY_COUNTS;
  }
}

export function inspectWorkspaceAnalysisDatabase(
  workspaceRoot: string,
): WorkspaceAnalysisDatabaseInspection {
  const databasePath = getWorkspaceAnalysisDatabasePath(workspaceRoot);
  if (!fs.existsSync(databasePath)) {
    return {
      ok: false,
      schemaVersion: null,
      expectedSchemaVersion: GRAPH_CACHE_SCHEMA_VERSION,
      schemaCompatible: false,
      records: EMPTY_COUNTS,
      message: 'Graph Cache does not exist.',
    };
  }

  try {
    return withReadOnlyConnection(databasePath, connection => {
      const versionRow = readRowsSync(connection, 'PRAGMA user_version')[0];
      const schemaVersion = typeof versionRow?.user_version === 'number'
        ? versionRow.user_version
        : Number(versionRow?.user_version ?? 0);
      const schemaCompatible = schemaVersion === GRAPH_CACHE_SCHEMA_VERSION
        && hasCurrentGraphCacheSchema(connection);
      const integrityRow = readRowsSync(connection, 'PRAGMA quick_check')[0];
      const integrityValue = integrityRow ? Object.values(integrityRow)[0] : undefined;
      const integrityOk = integrityValue === 'ok';
      const foreignKeyOk = readRowsSync(connection, 'PRAGMA foreign_key_check').length === 0;
      const records = schemaCompatible
        ? readWorkspaceAnalysisDatabaseRecordCountsFromConnection(connection)
        : EMPTY_COUNTS;
      const ok = schemaCompatible && integrityOk && foreignKeyOk;
      return {
        ok,
        schemaVersion,
        expectedSchemaVersion: GRAPH_CACHE_SCHEMA_VERSION,
        schemaCompatible,
        records,
        ...(!ok ? { message: schemaCompatible
          ? 'Graph Cache integrity check failed.'
          : 'Graph Cache schema does not match this CodeGraphy version.' } : {}),
      };
    });
  } catch (error) {
    return {
      ok: false,
      schemaVersion: null,
      expectedSchemaVersion: GRAPH_CACHE_SCHEMA_VERSION,
      schemaCompatible: false,
      records: EMPTY_COUNTS,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

function readWorkspaceAnalysisDatabaseRecordCountsFromConnection(
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

export function readWorkspaceAnalysisDatabaseSnapshot(
  workspaceRoot: string,
): WorkspaceAnalysisDatabaseSnapshot {
  const databasePath = getWorkspaceAnalysisDatabasePath(workspaceRoot);
  if (!fs.existsSync(databasePath)) return EMPTY_SNAPSHOT;

  try {
    return withReadOnlyConnection(databasePath, connection => {
      return parseDatabaseRecords(
        readRowsSync(connection, FILE_ROWS_QUERY) as FileRow[],
        readRowsSync(connection, NODE_ROWS_QUERY) as GraphNodeRow[],
        readRowsSync(connection, SYMBOL_ROWS_QUERY) as SymbolRow[],
        readRowsSync(connection, EDGE_ROWS_QUERY) as GraphEdgeRow[],
        workspaceRoot,
      );
    });
  } catch (error) {
    console.warn('[CodeGraphy] Failed to read structured analysis snapshot.', error);
    return EMPTY_SNAPSHOT;
  }
}
