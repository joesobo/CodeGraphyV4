import { Connection, Database } from '@ladybugdb/core';
import type * as lb from '@ladybugdb/core';
import type { FileAnalysisRow } from '../records/contracts';

interface LadybugQueryResultLike {
  getAll?(): Promise<FileAnalysisRow[]>;
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

function firstQueryResult(result: unknown): LadybugQueryResultLike | undefined {
  return (Array.isArray(result) ? result[0] : result) as LadybugQueryResultLike | undefined;
}

function readRowsFromQueryResultSync(queryResult: LadybugQueryResultLike | undefined): FileAnalysisRow[] {
  return queryResult?.getAllSync?.() ?? [];
}

async function readRowsFromQueryResultAsync(
  queryResult: LadybugQueryResultLike | undefined,
): Promise<FileAnalysisRow[]> {
  return queryResult?.getAll?.() ?? [];
}

export function runStatementSync(connection: lb.Connection, statement: string): void {
  const result = connection.querySync(statement);
  closeQueryResults(result);
}

export async function runStatementAsync(connection: lb.Connection, statement: string): Promise<void> {
  const result = await connection.query(statement);
  closeQueryResults(result);
}

export function prepareStatementSync(
  connection: lb.Connection,
  statement: string,
): lb.PreparedStatement {
  const preparedStatement = connection.prepareSync(statement);
  if (!preparedStatement.isSuccess()) {
    throw new Error(preparedStatement.getErrorMessage());
  }
  return preparedStatement;
}

export async function prepareStatementAsync(
  connection: lb.Connection,
  statement: string,
): Promise<lb.PreparedStatement> {
  const preparedStatement = await connection.prepare(statement);
  if (!preparedStatement.isSuccess()) {
    throw new Error(preparedStatement.getErrorMessage());
  }
  return preparedStatement;
}

export function executeStatementSync(
  connection: lb.Connection,
  preparedStatement: lb.PreparedStatement,
  params: Record<string, lb.LbugValue>,
): void {
  const result = connection.executeSync(preparedStatement, params);
  closeQueryResults(result);
}

export async function executeStatementAsync(
  connection: lb.Connection,
  preparedStatement: lb.PreparedStatement,
  params: Record<string, lb.LbugValue>,
): Promise<void> {
  const result = await connection.execute(preparedStatement, params);
  closeQueryResults(result);
}

export function readRowsSync(connection: lb.Connection, statement: string): FileAnalysisRow[] {
  const result = connection.querySync(statement);

  try {
    return readRowsFromQueryResultSync(firstQueryResult(result));
  } finally {
    closeQueryResults(result);
  }
}

export async function readRowsAsync(connection: lb.Connection, statement: string): Promise<FileAnalysisRow[]> {
  const result = await connection.query(statement);

  try {
    return await readRowsFromQueryResultAsync(firstQueryResult(result));
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

async function ensureSchemaAsync(connection: lb.Connection): Promise<void> {
  await runStatementAsync(
    connection,
    'CREATE NODE TABLE IF NOT EXISTS FileAnalysis(filePath STRING PRIMARY KEY, mtime INT64, size INT64, analysis STRING)',
  );
  await runStatementAsync(
    connection,
    'CREATE NODE TABLE IF NOT EXISTS Symbol(symbolId STRING PRIMARY KEY, filePath STRING, name STRING, kind STRING, signature STRING, rangeJson STRING, metadataJson STRING)',
  );
  await runStatementAsync(
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

export async function withConnectionAsync<T>(
  databasePath: string,
  callback: (connection: lb.Connection) => Promise<T>,
): Promise<T> {
  const database = new Database(databasePath);
  const connection = new Connection(database);

  try {
    await connection.init();
    await ensureSchemaAsync(connection);
    return await callback(connection);
  } finally {
    await connection.close();
    await database.close();
  }
}
