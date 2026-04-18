import { Connection, Database } from '@ladybugdb/core';
import type * as lb from '@ladybugdb/core';
import type { FileAnalysisRow } from '../records/contracts';

interface LadybugQueryResultLike {
  getAllSync?(): FileAnalysisRow[];
  close?(): void;
}

function closeQueryResults(result: unknown): void {
  const queryResults = Array.isArray(result) ? result : [result];

  for (const queryResult of queryResults) {
    try {
      (queryResult as LadybugQueryResultLike | undefined)?.close?.();
    } catch {
      // Best effort only.
    }
  }
}

export function runStatementSync(connection: lb.Connection, statement: string): void {
  const result = connection.querySync(statement);
  closeQueryResults(result);
}

export function readRowsSync(connection: lb.Connection, statement: string): FileAnalysisRow[] {
  const result = connection.querySync(statement);

  try {
    const queryResult = Array.isArray(result) ? result[0] : result;
    return (queryResult as LadybugQueryResultLike | undefined)?.getAllSync?.() ?? [];
  } finally {
    closeQueryResults(result);
  }
}

function ensureSchema(connection: lb.Connection): void {
  runStatementSync(
    connection,
    'CREATE NODE TABLE IF NOT EXISTS FileAnalysis(filePath STRING PRIMARY KEY, mtime INT64, size INT64, analysis STRING)',
  );
  runStatementSync(
    connection,
    'CREATE NODE TABLE IF NOT EXISTS Symbol(symbolId STRING PRIMARY KEY, filePath STRING, name STRING, kind STRING, signature STRING, rangeJson STRING, metadataJson STRING)',
  );
  runStatementSync(
    connection,
    'CREATE NODE TABLE IF NOT EXISTS Relation(relationId STRING PRIMARY KEY, filePath STRING, kind STRING, pluginId STRING, sourceId STRING, fromFilePath STRING, toFilePath STRING, fromNodeId STRING, toNodeId STRING, fromSymbolId STRING, toSymbolId STRING, specifier STRING, relationType STRING, variant STRING, resolvedPath STRING, metadataJson STRING)',
  );
}

export function withConnection<T>(
  databasePath: string,
  callback: (connection: lb.Connection) => T,
): T {
  const database = new Database(databasePath);
  const connection = new Connection(database);

  try {
    connection.initSync();
    ensureSchema(connection);
    return callback(connection);
  } finally {
    connection.closeSync();
    database.closeSync();
  }
}
