import * as fs from 'node:fs';
import { readRowsSync, withReadOnlyConnection } from '../io/connection';
import { getWorkspaceAnalysisDatabasePath } from '../io/paths';
import { GRAPH_CACHE_SCHEMA_VERSION, hasCurrentGraphCacheSchema } from '../io/schema';
import {
  EMPTY_WORKSPACE_ANALYSIS_DATABASE_RECORD_COUNTS,
  readWorkspaceAnalysisDatabaseRecordCountsFromConnection,
  type WorkspaceAnalysisDatabaseRecordCounts,
} from '../recordCounts/model';

export interface WorkspaceAnalysisDatabaseInspection {
  ok: boolean;
  schemaVersion: number | null;
  expectedSchemaVersion: number;
  schemaCompatible: boolean;
  integrityOk: boolean;
  foreignKeyOk: boolean;
  records: WorkspaceAnalysisDatabaseRecordCounts;
  message?: string;
}

function failedInspection(message: string): WorkspaceAnalysisDatabaseInspection {
  return {
    ok: false,
    schemaVersion: null,
    expectedSchemaVersion: GRAPH_CACHE_SCHEMA_VERSION,
    schemaCompatible: false,
    integrityOk: false,
    foreignKeyOk: false,
    records: EMPTY_WORKSPACE_ANALYSIS_DATABASE_RECORD_COUNTS,
    message,
  };
}

export function inspectWorkspaceAnalysisDatabase(
  workspaceRoot: string,
): WorkspaceAnalysisDatabaseInspection {
  const databasePath = getWorkspaceAnalysisDatabasePath(workspaceRoot);
  if (!fs.existsSync(databasePath)) return failedInspection('Graph Cache does not exist.');

  try {
    return withReadOnlyConnection(databasePath, connection => {
      const versionRow = readRowsSync(connection, 'PRAGMA user_version')[0];
      const schemaVersion = Number(versionRow?.user_version ?? 0);
      const schemaCompatible = schemaVersion === GRAPH_CACHE_SCHEMA_VERSION
        && hasCurrentGraphCacheSchema(connection);
      const integrityRow = readRowsSync(connection, 'PRAGMA quick_check')[0];
      const integrityOk = Object.values(integrityRow ?? {})[0] === 'ok';
      const foreignKeyOk = readRowsSync(connection, 'PRAGMA foreign_key_check').length === 0;
      const records = schemaCompatible
        ? readWorkspaceAnalysisDatabaseRecordCountsFromConnection(connection)
        : EMPTY_WORKSPACE_ANALYSIS_DATABASE_RECORD_COUNTS;
      const ok = schemaCompatible && integrityOk && foreignKeyOk;
      return {
        ok,
        schemaVersion,
        expectedSchemaVersion: GRAPH_CACHE_SCHEMA_VERSION,
        schemaCompatible,
        integrityOk,
        foreignKeyOk,
        records,
        ...(!ok ? { message: schemaCompatible
          ? 'Graph Cache integrity check failed.'
          : 'Graph Cache schema does not match this CodeGraphy version.' } : {}),
      };
    });
  } catch (error) {
    return failedInspection(error instanceof Error ? error.message : String(error));
  }
}
